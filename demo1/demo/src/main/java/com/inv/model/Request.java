package com.inv.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class Request {
    private String requestId;     // แก้เป็น String
    private LocalDate requestDate;
    private String status;
    private String orderId;       // แก้เป็น String
    private String customerId;    // แก้เป็น String
    private String staffId;       // แก้เป็น String
    private String description;
    private String approvedBy;    // แก้เป็น String
    private LocalDateTime approvedDate;
    private List<RequestItem> items;

    // --- Getters and Setters (ปรับ Type ของ ID) ---
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    //... (Getters and Setters ที่เหลือ)
    public LocalDate getRequestDate() { return requestDate; }
    public void setRequestDate(LocalDate requestDate) { this.requestDate = requestDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getApprovedDate() { return approvedDate; }
    public void setApprovedDate(LocalDateTime approvedDate) { this.approvedDate = approvedDate; }

    public List<RequestItem> getItems() { return items; }
    public void setItems(List<RequestItem> items) { this.items = items; }
}