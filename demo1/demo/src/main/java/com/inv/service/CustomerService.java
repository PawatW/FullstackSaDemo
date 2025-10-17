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
        // 4. Validation
        if (customer.getCustomerName() == null || customer.getCustomerName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุชื่อลูกค้า (Customer name is required)");
        }

        if (customer.getPhone() != null && !customer.getPhone().trim().isEmpty()) {
            if (customerRepository.findByPhone(customer.getPhone()) != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "เบอร์โทรศัพท์นี้มีในระบบแล้ว (Phone number already exists)");
            }
        }

        if (customer.getEmail() != null && !customer.getEmail().trim().isEmpty()) {
            if (customerRepository.findByEmail(customer.getEmail()) != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "อีเมลนี้มีในระบบแล้ว (Email already exists)");
            }
        }

        // เพิ่ม: สร้าง ID ที่นี่
        String customerId = "CUS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        customer.setCustomerId(customerId);

        customerRepository.save(customer);
        return customer;
    }
}