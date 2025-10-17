package com.inv.model;

import java.time.LocalDateTime;

public class StockTransaction {
    private String transactionId;
    private LocalDateTime transactionDate;
    private String type;
    private String productId;
    private int quantity;
    private String staffId;
    private String description; // ถูกต้องตาม schema ใหม่

    // --- Getters and Setters ---
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}