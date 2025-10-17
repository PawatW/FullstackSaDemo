package com.inv.controller;

import com.inv.model.Order;
import com.inv.model.OrderItem;
import com.inv.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity; // Import เพิ่ม
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @GetMapping
    public List<Order> getAllOrders() {
        return orderService.getAllOrders();
    }

    @PostMapping
    public String createOrder(@RequestBody OrderRequest orderRequest, Principal principal) { // return String
        String staffId = principal.getName();
        return orderService.createOrder(orderRequest.getOrder(), orderRequest.getItems(), staffId);
    }

    @GetMapping("/confirmed")
    public List<Order> getConfirmedOrders() {
        return orderService.getConfirmedOrders();
    }

    @GetMapping("/{orderId}/items")
    public List<OrderItem> getOrderItems(@PathVariable String orderId) { // รับ String orderId
        return orderService.getItemsByOrderId(orderId);
    }

    @GetMapping("/ready-to-close")
    public List<Order> getReadyToCloseOrders() {
        return orderService.getOrdersReadyToClose();
    }

    @PutMapping("/{orderId}/close")
    public ResponseEntity<Void> closeOrder(@PathVariable String orderId, Principal principal) { // รับ String orderId
        String staffId = principal.getName();
        orderService.closeOrder(orderId, staffId);
        return ResponseEntity.ok().build();
    }

    public static class OrderRequest {
        private Order order;
        private List<OrderItem> items;
        // getters and setters
        public Order getOrder() { return order; }
        public void setOrder(Order order) { this.order = order; }
        public List<OrderItem> getItems() { return items; }
        public void setItems(List<OrderItem> items) { this.items = items; }
    }
}