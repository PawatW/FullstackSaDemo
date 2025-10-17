package com.inv.service;

import com.inv.model.Order;
import com.inv.model.OrderItem;
import com.inv.repo.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID; // Import เพิ่ม

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @Transactional
    public String createOrder(Order order, List<OrderItem> items, String staffId) { // return String
        String orderId = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        order.setOrderId(orderId);
        order.setStaffId(staffId);
        orderRepository.save(order);

        for (OrderItem item : items) {
            String orderItemId = "ITM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            item.setOrderItemId(orderItemId);
            item.setOrderId(orderId);
            orderRepository.saveOrderItem(item);
        }
        return orderId;
    }

    public List<Order> getConfirmedOrders() {
        return orderRepository.findConfirmedOrders();
    }

    public List<OrderItem> getItemsByOrderId(String orderId) { // รับ String orderId
        return orderRepository.findItemsByOrderId(orderId);
    }

    public List<Order> getOrdersReadyToClose() {
        return orderRepository.findOrdersReadyToClose();
    }

    @Transactional
    public void closeOrder(String orderId, String staffId) { // รับ String IDs
        if (orderRepository.hasPendingRequests(orderId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ยังมีคำขอเบิกสินค้าที่ยังค้างอยู่ ไม่สามารถปิด Order ได้");
        }
        orderRepository.closeOrder(orderId, staffId);
    }
}