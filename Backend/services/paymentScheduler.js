// ==================== IMPORTS ====================
const Purchase = require("../models/Purchase");
const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const { createNotification } = require("../utils/notificationHelper");

// ==================== SCHEDULED PAYMENT PROCESSORS ====================
const processScheduledPurchasePayments = async () => {
  try {
    console.log("🔄 Running scheduled payment processor for purchases...");
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    // Find all purchases with scheduled payments that are due today or overdue
    const purchasesWithScheduledPayments = await Purchase.find({
      "payments.status": "scheduled",
      "payments.date": {
        $lte: today  // Process all past-due and today's scheduled payments
      }
    }).populate("items.inventoryId");
    
    console.log(`📅 Found ${purchasesWithScheduledPayments.length} purchases with scheduled payments due today`);
    
    let processedCount = 0;
    
    for (const purchase of purchasesWithScheduledPayments) {
      try {
        // For each due scheduled payment, create a "Pay Now" notification instead of auto-marking paid
        for (let i = 0; i < purchase.payments.length; i++) {
          const payment = purchase.payments[i];
          if (payment.status === "scheduled" && payment.date <= today) {
            // Check if we already sent a due notification for this installment today
            const existingNotif = await Notification.findOne({
              type: "installment_due",
              "metadata.purchaseId": purchase._id.toString(),
              "metadata.installmentIndex": i,
              "metadata.notifiedDate": new Date().toISOString().split('T')[0],
            });

            if (!existingNotif) {
              const dueDate = new Date(payment.date).toLocaleDateString('en-NP', {
                year: 'numeric', month: 'short', day: 'numeric',
              });
              try {
                await createNotification({
                  tenantKey: purchase.tenantKey,
                  type: "installment_due",
                  title: "Installment Payment Due",
                  message: `Rs ${payment.amount.toFixed(2)} installment is due for purchase ${purchase.purchaseNumber} from ${purchase.supplierName} (due: ${dueDate}). Pay now via Khalti.`,
                  priority: "high",
                  relatedId: purchase._id,
                  relatedModel: "Purchase",
                  metadata: {
                    purchaseId: purchase._id.toString(),
                    purchaseNumber: purchase.purchaseNumber,
                    supplierName: purchase.supplierName,
                    amount: payment.amount,
                    dueDate: payment.date,
                    installmentIndex: i,
                    notifiedDate: new Date().toISOString().split('T')[0],
                  },
                });
                console.log(`🔔 Sent installment due notification for purchase ${purchase.purchaseNumber}, installment #${i + 1} (Rs ${payment.amount})`);
                processedCount++;
              } catch (notifError) {
                console.error(`❌ Failed to create notification for purchase ${purchase.purchaseNumber}:`, notifError);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing scheduled payments for purchase ${purchase.purchaseNumber}:`, error);
      }
    }
    
    console.log(`✅ Processed ${processedCount} purchases with scheduled payments`);
    return { processedCount, totalPurchases: purchasesWithScheduledPayments.length };
    
  } catch (error) {
    console.error("Error in processScheduledPurchasePayments:", error);
    throw error;
  }
};

/**
 * Process scheduled payments for sales that are due today
 */
const processScheduledSalePayments = async () => {
  try {
    console.log("🔄 Running scheduled payment processor for sales...");
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    // Find all sales with scheduled payments that are due today or overdue
    const salesWithScheduledPayments = await Sale.find({
      "payments.status": "scheduled",
      "payments.date": {
        $lte: today  // Process all past-due and today's scheduled payments
      }
    }).populate("items.inventoryId");
    
    console.log(`📅 Found ${salesWithScheduledPayments.length} sales with scheduled payments due today`);
    
    let processedCount = 0;
    
    for (const sale of salesWithScheduledPayments) {
      try {
        let hasChanges = false;
        let totalProcessedAmount = 0;
        
        // Process each scheduled payment that's due
        for (let payment of sale.payments) {
          if (payment.status === "scheduled" && payment.date <= today) {
            // Mark payment as completed
            payment.status = "completed";
            hasChanges = true;
            totalProcessedAmount += payment.amount;
            
            // Update sale amounts
            sale.paidAmount = (sale.paidAmount || 0) + payment.amount;
            sale.scheduledAmount = Math.max(0, (sale.scheduledAmount || 0) - payment.amount);
            
            console.log(`✅ Processed scheduled payment of Rs ${payment.amount} for sale ${sale.invoiceNumber}`);
          }
        }
        
        if (hasChanges) {
          // Update payment status based on new amounts
          const currentScheduledAmount = sale.scheduledAmount || 0;
          
          if (sale.paidAmount >= sale.total) {
            sale.paymentStatus = "paid";
          } else if (sale.paidAmount > 0 || currentScheduledAmount > 0) {
            sale.paymentStatus = "partial";
          } else {
            sale.paymentStatus = "unpaid";
          }
          
          await sale.save();
          
          // Sync with Invoice
          try {
            const Invoice = require('../models/Invoice');
            const invoice = await Invoice.findOne({ relatedId: sale._id, type: 'sale' });
            if (invoice) {
              invoice.paymentStatus = sale.paymentStatus;
              invoice.paidAmount = sale.paidAmount;
              if (sale.paymentStatus === "paid") {
                invoice.status = "paid";
              }
              await invoice.save();
              console.log(`🔄 Synced scheduled payment with Invoice ${invoice._id}`);
            }
          } catch (syncError) {
            console.error('⚠️ Failed to sync scheduled payment to invoice:', syncError);
          }
          
          // Create notification
          try {
            let notificationTitle, notificationMessage;
            
            if (sale.paymentStatus === "paid") {
              notificationTitle = "Customer Payment Received - Fully Paid";
              notificationMessage = `Scheduled payment of Rs ${totalProcessedAmount.toFixed(2)} has been received from customer for sale ${sale.invoiceNumber}. Sale is now fully paid.`;
            } else {
              const remaining = sale.total - sale.paidAmount;
              notificationTitle = "Customer Payment Received";
              notificationMessage = `Scheduled payment of Rs ${totalProcessedAmount.toFixed(2)} has been received from customer for sale ${sale.invoiceNumber}. Remaining balance: Rs ${remaining.toFixed(2)}.`;
            }
            
            await createNotification({
              type: "scheduled_payment_received",
              title: notificationTitle,
              message: notificationMessage,
              priority: "medium",
              relatedId: sale._id,
              relatedModel: "Sale",
              metadata: {
                invoiceNumber: sale.invoiceNumber,
                customerName: sale.customerName,
                processedAmount: totalProcessedAmount,
                totalAmount: sale.total,
                paidAmount: sale.paidAmount,
                remainingAmount: sale.total - sale.paidAmount,
                paymentStatus: sale.paymentStatus,
                processedDate: new Date().toISOString(),
              },
            });
          } catch (notifError) {
            console.error("Failed to create scheduled payment notification:", notifError);
          }
          
          processedCount++;
        }
      } catch (error) {
        console.error(`Error processing scheduled payments for sale ${sale.invoiceNumber}:`, error);
      }
    }
    
    console.log(`✅ Processed ${processedCount} sales with scheduled payments`);
    return { processedCount, totalSales: salesWithScheduledPayments.length };
    
  } catch (error) {
    console.error("Error in processScheduledSalePayments:", error);
    throw error;
  }
};

/**
 * Main function to process all scheduled payments
 */
const processAllScheduledPayments = async () => {
  try {
    console.log("🚀 Starting scheduled payment processing...");
    
    const results = await Promise.all([
      processScheduledPurchasePayments(),
      processScheduledSalePayments()
    ]);
    
    const [purchaseResults, saleResults] = results;
    
    const summary = {
      purchases: purchaseResults,
      sales: saleResults,
      totalProcessed: purchaseResults.processedCount + saleResults.processedCount,
      processedAt: new Date().toISOString()
    };
    
    console.log("📊 Scheduled Payment Processing Summary:", summary);
    
    return summary;
  } catch (error) {
    console.error("Error in processAllScheduledPayments:", error);
    throw error;
  }
};

/**
 * Get upcoming scheduled payments (next 7 days)
 */
const getUpcomingScheduledPayments = async () => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const upcomingPurchasePayments = await Purchase.find({
      "payments.status": "scheduled",
      "payments.date": {
        $gte: today,
        $lte: nextWeek
      }
    }).select('purchaseNumber supplierName total payments paymentStatus');
    
    const upcomingSalePayments = await Sale.find({
      "payments.status": "scheduled",
      "payments.date": {
        $gte: today,
        $lte: nextWeek
      }
    }).select('invoiceNumber customerName total payments paymentStatus');
    
    return {
      purchases: upcomingPurchasePayments,
      sales: upcomingSalePayments,
      summary: {
        totalPurchasePayments: upcomingPurchasePayments.length,
        totalSalePayments: upcomingSalePayments.length,
        dateRange: {
          from: today.toISOString().split('T')[0],
          to: nextWeek.toISOString().split('T')[0]
        }
      }
    };
  } catch (error) {
    console.error("Error in getUpcomingScheduledPayments:", error);
    throw error;
  }
};

// ==================== DELIVERY PROCESSOR ====================

/**
 * Auto-receive pending purchases whose expectedDeliveryDate has arrived.
 * Updates inventory stock and marks them as received.
 * This runs automatically every hour to move products from "Upcoming" to "Inventory"
 */
const processDeliveries = async () => {
  try {
    console.log("📦 Running delivery processor...");
    console.log(`📅 Current date/time: ${new Date().toISOString()}`);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Pending purchases whose expected delivery date is today or earlier
    const dueDeliveries = await Purchase.find({
      status: "pending",
      expectedDeliveryDate: { $exists: true, $ne: null, $lte: todayEnd },
    }).populate("items.inventoryId");

    console.log(`📦 Found ${dueDeliveries.length} deliveries due today or overdue`);

    if (dueDeliveries.length > 0) {
      console.log("📋 Deliveries to process:");
      dueDeliveries.forEach(p => {
        console.log(`  - ${p.purchaseNumber}: ${p.supplierName} (Expected: ${p.expectedDeliveryDate.toISOString().split('T')[0]})`);
      });
    }

    let receivedCount = 0;
    let itemsAddedToInventory = 0;

    for (const purchase of dueDeliveries) {
      try {
        console.log(`\n🔄 Processing purchase ${purchase.purchaseNumber}...`);
        
        // Update inventory for each item
        for (const item of purchase.items) {
          let inv = null;

          if (item.inventoryId) {
            // Already linked to an inventory record — just increment stock
            inv = await Inventory.findById(item.inventoryId._id || item.inventoryId);
          }

          if (!inv) {
            // Try to find by name (item may not have been linked at purchase creation)
            inv = await Inventory.findOne({ name: item.name });
          }

          if (inv) {
            const oldStock = inv.stock;
            inv.stock += item.quantity;
            if (item.cost && item.cost > 0) inv.cost = item.cost;
            if (item.sellingPrice && item.sellingPrice > 0) inv.price = item.sellingPrice;
            if (!item.inventoryId) {
              // Back-fill the inventoryId on the purchase item
              item.inventoryId = inv._id;
            }
            await inv.save();
            console.log(`  ✅ Updated "${item.name}": stock ${oldStock} → ${inv.stock} (+${item.quantity})`);
            itemsAddedToInventory++;
          } else {
            // Create a brand-new inventory record for this item
            const sku = item.name
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .substring(0, 8) + '-' + Date.now().toString().slice(-6);

            const foodKeywords = ['food', 'beverages', 'dairy', 'produce', 'frozen', 'bakery', 'meat', 'poultry', 'seafood', 'snacks', 'fresh'];
            const isFoodItem = item.category && foodKeywords.some(k =>
              item.category.toLowerCase().includes(k.toLowerCase())
            );

            const invData = {
              name: item.name,
              sku,
              category: item.category || 'Other',
              price: item.sellingPrice || item.cost || 0,
              cost: item.cost || 0,
              stock: item.quantity,
              reorderLevel: 5,
              supplier: purchase.supplierName || 'Unknown',
              preferredSupplierId: purchase.supplierId || null,
              location: 'Warehouse',
              categoryType: isFoodItem ? 'food' : 'non-food',
            };
            if (item.expiryDate) invData.expiryDate = new Date(item.expiryDate);
            inv = await Inventory.create(invData);
            item.inventoryId = inv._id;
            console.log(`  ✅ Created new inventory record for "${item.name}" (${inv._id}) with ${item.quantity} units`);
            itemsAddedToInventory++;
          }
        }

        purchase.status = "received";
        await purchase.save();

        // Notification
        try {
          await createNotification({
            type: "delivery_received",
            title: "Delivery Received",
            message: `Purchase ${purchase.purchaseNumber} from ${purchase.supplierName} has been automatically received — ${purchase.items.length} item(s) added to inventory.`,
            priority: "medium",
            relatedId: purchase._id,
            relatedModel: "Purchase",
            metadata: {
              purchaseNumber: purchase.purchaseNumber,
              supplierName: purchase.supplierName,
              expectedDeliveryDate: purchase.expectedDeliveryDate,
              receivedAt: new Date().toISOString(),
              itemsCount: purchase.items.length,
            },
          });
        } catch (notifErr) {
          console.error("Failed to create delivery notification:", notifErr);
        }

        receivedCount++;
        console.log(`✅ Auto-received purchase ${purchase.purchaseNumber} - moved from Upcoming to Inventory`);
      } catch (err) {
        console.error(`❌ Error auto-receiving purchase ${purchase.purchaseNumber}:`, err);
      }
    }

    console.log(`\n📊 Delivery Processing Summary:`);
    console.log(`  - Purchases received: ${receivedCount}`);
    console.log(`  - Items added to inventory: ${itemsAddedToInventory}`);
    console.log(`  - These items are now available in Inventory page and removed from Upcoming page\n`);
    
    return { receivedCount, itemsAddedToInventory };
  } catch (error) {
    console.error("❌ Error in processDeliveries:", error);
    throw error;
  }
};

module.exports = {
  processScheduledPurchasePayments,
  processScheduledSalePayments,
  processAllScheduledPayments,
  getUpcomingScheduledPayments,
  processDeliveries,
};