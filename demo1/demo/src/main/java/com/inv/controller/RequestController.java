package com.inv.controller;

import com.inv.model.Request;
import com.inv.model.RequestItem;
import com.inv.service.RequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Collections;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/requests")
public class RequestController {

    @Autowired
    private RequestService requestService;

    @GetMapping
    public ResponseEntity<List<Request>> getAllRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String orderId // <-- 1. เพิ่มตัวนี้
    ) {
        List<Request> requests;

        // vvv 2. เพิ่มเงื่อนไขนี้ vvv
        if (orderId != null && !orderId.isEmpty()) {
            requests = requestService.getRequestsByOrderId(orderId);
        }
        // ^^^ สิ้นสุดส่วนที่เพิ่ม ^^^
        else if ("pending".equals(status)) {
            requests = requestService.getPendingRequests();
        } else if ("ready-to-close".equals(status)) {
            requests = requestService.getReadyToCloseRequests();
        } else {
            requests = requestService.getAllRequests();
        }
        return ResponseEntity.ok(requests);
    }

    @PostMapping
    public Map<String, String> createRequest(@RequestBody RequestRequest reqRequest, Principal principal) { // return Map
        String staffId = principal.getName();
        reqRequest.getRequest().setStaffId(staffId);
        String newRequestId = requestService.createRequest(reqRequest.getRequest(), reqRequest.getItems());

        // ส่งกลับเป็น Map เพื่อให้ Spring Boot แปลงเป็น JSON
        return Collections.singletonMap("requestId", newRequestId);
    }
    @GetMapping("/pending")
    public List<Request> getPendingRequests() {
        return requestService.getPendingRequests();
    }

    @GetMapping("/{requestId}/items")
    public List<RequestItem> getRequestItems(@PathVariable String requestId) { // รับ String
        return requestService.getItemsByRequestId(requestId);
    }

    @PutMapping("/{id}/approve")
    public void approve(@PathVariable String id, Principal principal) { // รับ String
        String approverId = principal.getName();
        requestService.approveRequest(id, approverId);
    }

    @PutMapping("/{id}/reject")
    public void reject(@PathVariable String id, Principal principal) { // รับ String
        String approverId = principal.getName();
        requestService.rejectRequest(id, approverId);
    }

    @GetMapping("/ready-to-close")
    public List<Request> getReadyToCloseRequests() {
        return requestService.getReadyToCloseRequests();
    }

    @PutMapping("/{id}/close")
    public void closeRequest(@PathVariable String id, Principal principal) { // รับ String
        String staffId = principal.getName();
        requestService.closeRequest(id, staffId);
    }

    public static class RequestRequest {
        private Request request;
        private List<RequestItem> items;
        public Request getRequest() { return request; }
        public void setRequest(Request request) { this.request = request; }
        public List<RequestItem> getItems() { return items; }
        public void setItems(List<RequestItem> items) { this.items = items; }
    }
}