package com.inv.service;

import com.inv.model.Customer;
import com.inv.repo.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID; // Import เพิ่ม

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Customer getCustomerById(String id) { // รับ String id
        return customerRepository.findById(id);
    }

    public Customer createCustomer(Customer customer) {
        String name = trimToNull(customer.getCustomerName());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุชื่อลูกค้า (Customer name is required)");
        }

        String address = trimToNull(customer.getAddress());
        String phone = trimToNull(customer.getPhone());
        String email = trimToNull(customer.getEmail());

        if (phone != null && customerRepository.findByPhone(phone) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "เบอร์โทรศัพท์นี้มีในระบบแล้ว (Phone number already exists)");
        }

        if (email != null && customerRepository.findByEmail(email) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "อีเมลนี้มีในระบบแล้ว (Email already exists)");
        }

        String customerId = "CUS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        customer.setCustomerId(customerId);
        customer.setCustomerName(name);
        customer.setAddress(address);
        customer.setPhone(phone);
        customer.setEmail(email);

        customerRepository.save(customer);
        return customer;
    }

    public Customer updateCustomer(String customerId, Customer payload) {
        Customer existing = customerRepository.findById(customerId);
        if (existing == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบลูกค้า (Customer not found)");
        }

        String name = trimToNull(payload.getCustomerName());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุชื่อลูกค้า (Customer name is required)");
        }

        String address = trimToNull(payload.getAddress());
        String phone = trimToNull(payload.getPhone());
        String email = trimToNull(payload.getEmail());

        if (phone != null) {
            Customer phoneOwner = customerRepository.findByPhone(phone);
            if (phoneOwner != null && !phoneOwner.getCustomerId().equals(customerId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "เบอร์โทรศัพท์นี้มีในระบบแล้ว (Phone number already exists)");
            }
        }

        if (email != null) {
            Customer emailOwner = customerRepository.findByEmail(email);
            if (emailOwner != null && !emailOwner.getCustomerId().equals(customerId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "อีเมลนี้มีในระบบแล้ว (Email already exists)");
            }
        }

        customerRepository.update(customerId, name, address, phone, email);

        Customer updated = customerRepository.findById(customerId);
        if (updated == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "ไม่สามารถอัปเดตลูกค้าได้ (Unable to update customer)");
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