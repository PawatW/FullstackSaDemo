package com.inv.service;

import com.inv.model.OrderItem;
import com.inv.model.Request;
import com.inv.model.RequestItem;
import com.inv.repo.OrderRepository;
import com.inv.repo.RequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID; // Import เพิ่ม

@Service
public class RequestService {

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private OrderRepository orderRepository;

    public List<Request> getAllRequests() {
        return requestRepository.findAll();
    }
    // vvv เพิ่ม Method นี้ vvv
    public List<Request> getRequestsByOrderId(String orderId) {
        return requestRepository.findByOrderId(orderId);
    }

    @Transactional
    public String createRequest(Request req, List<RequestItem> items) { // return String
        if (req.getOrderId() != null) {
            List<OrderItem> orderItems = orderRepository.findItemsByOrderId(req.getOrderId());
            Map<String, Integer> availableByProduct = new HashMap<>();
            for (OrderItem orderItem : orderItems) {
                availableByProduct.putIfAbsent(orderItem.getProductId(), orderItem.getRemainingQty());
            }

            Map<String, Integer> requestedByProduct = new HashMap<>();
            for (RequestItem item : items) {
                String productId = item.getProductId();
                if (!availableByProduct.containsKey(productId)) {
                    throw new IllegalArgumentException("ไม่พบสินค้าใน Order ที่เลือก");
                }
                int available = availableByProduct.get(productId);
                int nextRequested = requestedByProduct.getOrDefault(productId, 0) + item.getQuantity();
                if (nextRequested > available) {
                    throw new IllegalArgumentException("จำนวนที่ขอเบิกเกินจำนวนคงเหลือใน Order");
                }
                requestedByProduct.put(productId, nextRequested);
            }
        }

        String requestId = "REQ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        req.setRequestId(requestId);
        req.setRequestDate(LocalDateTime.now());
        if (req.getStatus() == null || req.getStatus().isBlank()) {
            req.setStatus("Awaiting Approval");
        }
        requestRepository.save(req);

        for (RequestItem i : items) {
            String requestItemId = "RIT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            i.setRequestItemId(requestItemId);
            i.setRequestId(requestId);
            requestRepository.saveRequestItem(i);
        }
        return requestId;
    }

    public List<Request> getPendingRequests() {
        return requestRepository.findPendingRequests();
    }

    public List<RequestItem> getItemsByRequestId(String requestId) { // รับ String
        return requestRepository.findItemsByRequestId(requestId);
    }

    public void approveRequest(String requestId, String approverId) { // รับ String
        requestRepository.updateStatus(requestId, "Approved", approverId);
    }

    public void rejectRequest(String requestId, String approverId) { // รับ String
        requestRepository.updateStatus(requestId, "Rejected", approverId);
    }

    public List<Request> getReadyToCloseRequests() {
        return requestRepository.findReadyToCloseRequests();
    }

    public void closeRequest(String requestId, String staffId) { // รับ String
        requestRepository.closeRequest(requestId, staffId);
    }
}