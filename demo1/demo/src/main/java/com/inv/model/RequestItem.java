package com.inv.model;

public class RequestItem {
    private String requestItemId; // แก้เป็น String
    private String requestId;     // แก้เป็น String
    private String productId;     // แก้เป็น String
    private int quantity;
    private int fulfilledQty;
    private int remainingQty;

    // --- Getters and Setters (ปรับ Type ของ ID) ---
    public String getRequestItemId() { return requestItemId; }
    public void setRequestItemId(String requestItemId) { this.requestItemId = requestItemId; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    //... (Getters and Setters ที่เหลือ)
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public int getFulfilledQty() { return fulfilledQty; }
    public void setFulfilledQty(int fulfilledQty) { this.fulfilledQty = fulfilledQty; }

    public int getRemainingQty() { return remainingQty; }
    public void setRemainingQty(int remainingQty) { this.remainingQty = remainingQty; }
}