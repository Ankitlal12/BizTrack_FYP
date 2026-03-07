const Purchase = require("../models/Purchase");
const Sale = require("../models/Sale");
const { createNotification } = require("../utils/notificationHelper");

/**
 * Payment Scheduler Service
 * Processes scheduled payments that are due for execution
 */

/**
 * Process scheduled payments for purchases that are due today
 */
const processScheduledPurchasePayments = async () => {
  try {
    console.log("🔄 Running scheduled payment processor for purchases...");
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); // Start of today
    
    // Find all purchases with scheduled payments due today or earlier
    const purchasesWithScheduledPayments = await Purchase.find({
      "payments.status": "scheduled",
      "payments.date": {
        $gte: startOfDay,
        $lte: today
      }
    }).populate("items.inventoryId");
    
    console.log(`📅 Found ${purchasesWithScheduledPayments.length} purchases with scheduled payments due today`);
    
    let processedCount = 0;
    
    for (const purchase of purchasesWithScheduledPayments) {
      try {
        let hasChanges = false;
        let totalProcessedAmount = 0;
        
        // Process each scheduled payment that's due
        for (let payment of purchase.payments) {
          if (payment.status === "scheduled" && payment.date <= today) {
            // Mark payment as completed
            payment.status = "completed";
            hasChanges = true;
            totalProcessedAmount += payment.amount;
            
            // Update purchase amounts
            purchase.paidAmount = (purchase.paidAmount || 0) + payment.amount;
            purchase.scheduledAmount = Math.max(0, (purchase.scheduledAmount || 0) - payment.amount);
            
            console.log(`✅ Processed scheduled payment of Rs ${payment.amount} for purchase ${purchase.purchaseNumber}`);
          }
        }
        
        if (hasChanges) {
          // Update payment status based on new amounts
          const currentScheduledAmount = purchase.scheduledAmount || 0;
          
          if (purchase.paidAmount >= purchase.total) {
            purchase.paymentStatus = "paid";
            // Update main status when payment is completed
            if (purchase.status === "pending") {
              purchase.status = "received";
            }
          } else if (purchase.paidAmount > 0 || currentScheduledAmount > 0) {
            purchase.paymentStatus = "partial";
          } else {
            purchase.paymentStatus = "unpaid";
          }
          
          await purchase.save();
          
          // Sync with Invoice
          try {
            const Invoice = require('../models/Invoice');
            const invoice = await Invoice.findOne({ relatedId: purchase._id, type: 'purchase' });
            if (invoice) {
              invoice.paymentStatus = purchase.paymentStatus;
              invoice.paidAmount = purchase.paidAmount;
              if (purchase.paymentStatus === "paid") {
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
            
            if (purchase.paymentStatus === "paid") {
              notificationTitle = "Scheduled Payment Completed - Fully Paid";
              notificationMessage = `Scheduled payment of Rs ${totalProcessedAmount.toFixed(2)} has been processed for purchase ${purchase.purchaseNumber}. Purchase is now fully paid.`;
            } else {
              const remaining = purchase.total - purchase.paidAmount;
              notificationTitle = "Scheduled Payment Completed";
              notificationMessage = `Scheduled payment of Rs ${totalProcessedAmount.toFixed(2)} has been processed for purchase ${purchase.purchaseNumber}. Remaining balance: Rs ${remaining.toFixed(2)}.`;
            }
            
            await createNotification({
              type: "scheduled_payment_processed",
              title: notificationTitle,
              message: notificationMessage,
              priority: "medium",
              relatedId: purchase._id,
              relatedModel: "Purchase",
              metadata: {
                purchaseNumber: purchase.purchaseNumber,
                supplierName: purchase.supplierName,
                processedAmount: totalProcessedAmount,
                totalAmount: purchase.total,
                paidAmount: purchase.paidAmount,
                remainingAmount: purchase.total - purchase.paidAmount,
                paymentStatus: purchase.paymentStatus,
                processedDate: new Date().toISOString(),
              },
            });
          } catch (notifError) {
            console.error("Failed to create scheduled payment notification:", notifError);
          }
          
          processedCount++;
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
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); // Start of today
    
    // Find all sales with scheduled payments due today or earlier
    const salesWithScheduledPayments = await Sale.find({
      "payments.status": "scheduled",
      "payments.date": {
        $gte: startOfDay,
        $lte: today
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

module.exports = {
  processScheduledPurchasePayments,
  processScheduledSalePayments,
  processAllScheduledPayments,
  getUpcomingScheduledPayments
};