package com.inv.service;

import com.inv.model.Product;
import com.inv.model.Request;
import com.inv.model.RequestItem;
import com.inv.model.StockTransaction;
import com.inv.repo.OrderRepository;
import com.inv.repo.ProductRepository;
import com.inv.repo.RequestRepository;
import com.inv.repo.StockTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;


@Service
public class StockService {

    @Autowired
    private ProductRepository productRepository;


    @Autowired
    private StockTransactionRepository stockTransactionRepository;
    @Autowired
    private RequestRepository requestRepository;
    @Autowired
    private OrderRepository orderRepository;

    @Transactional
    // แก้ไข: เปลี่ยน Type ของ ID ทั้งหมดเป็น String
    public void addStockIn(String productId, int quantity, String staffId, String supplierId, String note) {
        // 1. Update Stock Quantity
        productRepository.updateQuantity(productId, quantity);

        // 2. Record Stock Transaction
        StockTransaction transaction = new StockTransaction();
        String transactionId = "ST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        transaction.setTransactionId(transactionId);
        transaction.setType("IN");
        transaction.setProductId(productId);
        transaction.setQuantity(quantity);
        transaction.setStaffId(staffId);

        // สร้าง reference note ตาม use case
        String referenceNote = String.format("Stock-In from Supplier ID %s. Note: %s", supplierId, note);
        transaction.setDescription(referenceNote); // แก้ไข: ใช้ setDescription ตาม schema ใหม่

        stockTransactionRepository.save(transaction);
    }

    public List<Request> getApprovedRequests() {
        return requestRepository.findApprovedRequests();
    }

    @Transactional
    // แก้ไข: เปลี่ยน Type ของ ID ทั้งหมดเป็น String
    public void fulfillItem(String requestItemId, int fulfillQty, String warehouseStaffId) {
        // 9. Validation
        if (fulfillQty <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "จำนวนที่เบิกต้องมากกว่า 0");
        }
        RequestItem item = requestRepository.findItemById(requestItemId);
        if (item == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบรายการเบิกที่ระบุ");
        }
        if (fulfillQty > item.getRemainingQty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "จำนวนที่เบิกเกินกว่าที่เหลืออยู่");
        }
        Product product = productRepository.findById(item.getProductId());
        if (product.getQuantity() < fulfillQty) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "สินค้าในคลังไม่เพียงพอ");
        }

        // 11. Update Fulfillment
        // ① Update RequestItem
        requestRepository.updateItemFulfillment(requestItemId, fulfillQty);

        // ② Update Stock ใน Product (ส่งค่าติดลบ)
        productRepository.updateQuantity(item.getProductId(), -fulfillQty);

        // ③ Insert ลง StockTransaction (OUT)
        StockTransaction transaction = new StockTransaction();
        String transactionId = "ST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        transaction.setTransactionId(transactionId);
        transaction.setType("OUT");
        transaction.setProductId(item.getProductId());
        transaction.setQuantity(fulfillQty);
        transaction.setStaffId(warehouseStaffId);
        transaction.setDescription("Fulfill Request ID " + item.getRequestId());
        stockTransactionRepository.save(transaction);

        // 14. & 16. Post-Fulfillment Actions
        checkAndUpdateRequestAndOrderStatus(item.getRequestId(), item.getProductId(), fulfillQty);
    }

    // แก้ไข: เปลี่ยน Type ของ ID ทั้งหมดเป็น String
    private void checkAndUpdateRequestAndOrderStatus(String requestId, String productId, int fulfillQty) {
        if (requestRepository.areAllItemsFulfilled(requestId)) {
            requestRepository.updateRequestStatus(requestId, "Closed");
        }

        Request request = requestRepository.findById(requestId);
        if (request != null && request.getOrderId() != null) {
            orderRepository.updateOrderItemFulfillment(request.getOrderId(), productId, fulfillQty);
        }
    }
    public List<StockTransaction> getAllTransactions() {
        return stockTransactionRepository.findAll();
    }

}