package com.inv.service;

import com.inv.model.Supplier;
import com.inv.repo.SupplierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID; // Import เพิ่ม

@Service
public class SupplierService {

    @Autowired
    private SupplierRepository supplierRepository;

    public List<Supplier> getAllSuppliers() {
        return supplierRepository.findAll();
    }

    public Supplier getSupplierById(String id) { // รับ String id
        return supplierRepository.findById(id);
    }

    public Supplier createSupplier(Supplier supplier) {
        // 4. Validation
        if (supplier.getSupplierName() == null || supplier.getSupplierName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุชื่อ Supplier (Supplier name is required)");
        }

        if (supplier.getEmail() != null && !supplier.getEmail().trim().isEmpty()) {
            if (supplierRepository.findByEmail(supplier.getEmail()) != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "อีเมลนี้มีในระบบแล้ว (Email already exists)");
            }
        }

        // เพิ่ม: สร้าง ID ที่นี่
        String supplierId = "SUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        supplier.setSupplierId(supplierId);

        supplierRepository.save(supplier);
        return supplier;
    }
}