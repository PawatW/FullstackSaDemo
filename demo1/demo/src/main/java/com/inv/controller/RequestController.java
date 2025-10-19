package com.inv.controller;

import com.inv.model.Request;
import com.inv.model.RequestItem;
import com.inv.service.RequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
<<<<<<< HEAD
import java.util.Map;
import java.util.Collections;
=======
import org.springframework.web.server.ResponseStatusException;

>>>>>>> c1d03eb61a2cb5673853ee2c78d256f0c30e6327
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/requests")
public class RequestController {

    @Autowired
    private RequestService requestService;

    @GetMapping
    public List<Request> getAllRequests() {
        return requestService.getAllRequests();
    }

    @PostMapping
    public Map<String, String> createRequest(@RequestBody RequestRequest reqRequest, Principal principal) { // return Map
        String staffId = principal.getName();
        reqRequest.getRequest().setStaffId(staffId);
<<<<<<< HEAD
        String newRequestId = requestService.createRequest(reqRequest.getRequest(), reqRequest.getItems());
=======
        try {
            return requestService.createRequest(reqRequest.getRequest(), reqRequest.getItems());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
>>>>>>> c1d03eb61a2cb5673853ee2c78d256f0c30e6327

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