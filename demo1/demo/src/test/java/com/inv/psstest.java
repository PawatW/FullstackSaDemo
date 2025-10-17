package com.inv;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

public class psstest {
    public static void main(String[] args) {
        // ปรับค่า strength (cost factor) เป็น 12 เพื่อให้ตรงกับ SecurityConfig.java
        PasswordEncoder encoder = new BCryptPasswordEncoder(12); // ใช้ 12 ตาม SecurityConfig.java

        String rawPassword = "defaultPassword123"; // รหัสผ่านเริ่มต้นที่กำหนดใน StaffService

        System.out.println("==========================================");
        System.out.println("Raw password ที่ใช้: " + rawPassword);
        System.out.println("==========================================");

        String encodedPassword = encoder.encode(rawPassword);

        System.out.println("BCrypt encoded (ใช้สำหรับ INSERT ลง DB): \n" + encodedPassword);

        // ทดสอบการ match
        boolean matches = encoder.matches(rawPassword, encodedPassword);
        System.out.println("Match result (ควรเป็น True) : " + matches);

        // ทดสอบ password ผิด
        boolean wrong = encoder.matches("wrongpassword", encodedPassword);
        System.out.println("Match wrong (ควรเป็น False) : " + wrong);
        System.out.println("==========================================");
    }
}