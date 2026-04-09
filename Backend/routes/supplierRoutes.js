const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER, OWNER_ONLY } = require("../config/roles");
const {
  getAllSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier,
  activateSupplier, hardDeleteSupplier,
  getSupplierProducts, addProductToSupplier, removeProductFromSupplier,
  getSupplierPurchaseHistory,
} = require("../controllers/supplierController");

const router = express.Router();

// All supplier routes require authentication + owner/manager role
router.use(authenticate);
router.use(authorize(...OWNER_MANAGER));

router.get("/",                                          getAllSuppliers);
router.get("/:id",                                       getSupplierById);
router.post("/",                                         createSupplier);
router.put("/:id",                                       updateSupplier);
router.get("/:id/products",                              getSupplierProducts);
router.post("/:id/products",                             addProductToSupplier);
router.get("/:id/purchase-history",                      getSupplierPurchaseHistory);

// Delete + remove product — owner only
router.patch("/:id/activate",                            authorize(...OWNER_ONLY), activateSupplier);
router.delete("/:id/permanent",                         authorize(...OWNER_ONLY), hardDeleteSupplier);
router.delete("/:id",                                    authorize(...OWNER_ONLY), deleteSupplier);
router.delete("/:supplierId/products/:inventoryId",      authorize(...OWNER_ONLY), removeProductFromSupplier);

module.exports = router;
