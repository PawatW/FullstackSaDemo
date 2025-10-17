package com.inv.controller;

import com.inv.model.Request;
import com.inv.model.StockTransaction;
import com.inv.service.StockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stock")
public class StockController {

    @Autowired
    private StockService stockService;


    @GetMapping("/transactions")
    public List<StockTransaction> getAllTransactions() {
        return stockService.getAllTransactions();
    }

    @PostMapping("/in")
    public void addStockIn(@RequestBody StockInRequest request, Principal principal) {
        // แก้ไข: ไม่ต้องแปลงเป็น int แล้ว
        String staffId = principal.getName();

        stockService.addStockIn(
                request.getProductId(),
                request.getQuantity(),
                staffId,
                request.getSupplierId(),
                request.getNote()
        );
    }

    // --- Fulfillment / Stock-Out ---
    @GetMapping("/approved-requests")
    public List<Request> getApprovedRequests() {
        return stockService.getApprovedRequests();
    }

    @PostMapping("/fulfill")
    public void fulfillItem(@RequestBody FulfillRequest request, Principal principal) {
        // แก้ไข: ไม่ต้องแปลงเป็น int แล้ว
        String warehouseStaffId = principal.getName();
        stockService.fulfillItem(request.getRequestItemId(), request.getFulfillQty(), warehouseStaffId);
    }

    // Inner class สำหรับรับ JSON request ของการเบิกของ
    public static class FulfillRequest {
        private String requestItemId; // แก้เป็น String
        private int fulfillQty;

        // Getters and Setters
        public String getRequestItemId() { return requestItemId; }
        public void setRequestItemId(String requestItemId) { this.requestItemId = requestItemId; }
        public int getFulfillQty() { return fulfillQty; }
        public void setFulfillQty(int fulfillQty) { this.fulfillQty = fulfillQty; }
    }

    // Inner class สำหรับรับ JSON request
    public static class StockInRequest {
        private String productId;   // แก้เป็น String
        private int quantity;
        private String supplierId; // แก้เป็น String
        private String note;

        // Getters and Setters
        public String getProductId() { return productId; }
        public void setProductId(String productId) { this.productId = productId; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
        public String getSupplierId() { return supplierId; }
        public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }
}