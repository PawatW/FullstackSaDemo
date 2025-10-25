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
        String name = trimToNull(supplier.getSupplierName());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุชื่อ Supplier (Supplier name is required)");
        }

        String address = trimToNull(supplier.getAddress());
        String phone = trimToNull(supplier.getPhone());
        String email = trimToNull(supplier.getEmail());

        if (email != null) {
            Supplier emailOwner = supplierRepository.findByEmail(email);
            if (emailOwner != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "อีเมลนี้มีในระบบแล้ว (Email already exists)");
            }
        }

        String supplierId = "SUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        supplier.setSupplierId(supplierId);
        supplier.setSupplierName(name);
        supplier.setAddress(address);
        supplier.setPhone(phone);
        supplier.setEmail(email);

        supplierRepository.save(supplier);
        return supplier;
    }

    public Supplier updateSupplier(String supplierId, Supplier payload) {
        Supplier existing = supplierRepository.findById(supplierId);
        if (existing == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Supplier (Supplier not found)");
        }

        String name = trimToNull(payload.getSupplierName());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุชื่อ Supplier (Supplier name is required)");
        }

        String address = trimToNull(payload.getAddress());
        String phone = trimToNull(payload.getPhone());
        String email = trimToNull(payload.getEmail());

        if (email != null) {
            Supplier emailOwner = supplierRepository.findByEmail(email);
            if (emailOwner != null && !emailOwner.getSupplierId().equals(supplierId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "อีเมลนี้มีในระบบแล้ว (Email already exists)");
            }
        }

        supplierRepository.update(supplierId, name, address, phone, email);

        Supplier updated = supplierRepository.findById(supplierId);
        if (updated == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "ไม่สามารถอัปเดต Supplier ได้ (Unable to update supplier)");
        }
        return updated;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}