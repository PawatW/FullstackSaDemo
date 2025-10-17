package com.inv.service;

import com.inv.model.Staff;
import com.inv.repo.UserRepository; // แก้ไข: import StaffRepository
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID; // Import เพิ่ม

@Service
public class StaffService {

    @Autowired
    private UserRepository staffRepository; // แก้ไข: Autowired StaffRepository

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<Staff> getAllStaff() {
        return staffRepository.findAll();
    }

    public Staff createStaff(Staff staff) {
        if (staffRepository.findByEmail(staff.getEmail()) != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "อีเมลนี้ถูกใช้แล้ว (Email is already in use)");
        }

        String initialPassword = "defaultPassword123";
        staff.setPassword(passwordEncoder.encode(initialPassword));

        // เพิ่ม: สร้าง ID ที่นี่
        String staffId = "STF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        staff.setStaffId(staffId);

        staff.setActive(true);
        staffRepository.save(staff);

        staff.setPassword(null);
        return staff;
    }
}