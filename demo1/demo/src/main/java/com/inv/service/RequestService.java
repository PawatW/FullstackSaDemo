package com.inv.service;

import com.inv.model.Request;
import com.inv.model.RequestItem;
import com.inv.repo.RequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID; // Import เพิ่ม

@Service
public class RequestService {

    @Autowired
    private RequestRepository requestRepository;

    public List<Request> getAllRequests() {
        return requestRepository.findAll();
    }

    @Transactional
    public String createRequest(Request req, List<RequestItem> items) { // return String
        String requestId = "REQ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        req.setRequestId(requestId);
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