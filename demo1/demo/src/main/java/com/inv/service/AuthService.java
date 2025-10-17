package com.inv.service;

import com.inv.model.Staff;
import com.inv.repo.UserRepository; // แก้ไข: import StaffRepository
import com.inv.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository; // แก้ไข: Autowired StaffRepository

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public String login(String email, String password) {
        Staff staff = userRepository.findByEmail(email);
        if (staff == null || !passwordEncoder.matches(password, staff.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        if (!staff.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "บัญชีผู้ใช้นี้ถูกระงับ (Account is deactivated)");
        }

        // staffId เป็น String อยู่แล้ว ไม่ต้องแปลง
        return jwtUtil.generateToken(staff.getStaffId(), staff.getRole());
    }
}