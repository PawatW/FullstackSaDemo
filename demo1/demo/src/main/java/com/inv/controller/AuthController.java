package com.inv.controller;

import com.inv.model.Staff;
import com.inv.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class AuthController {

    @Autowired
    private AuthService authService;

    @GetMapping("/test")
    public String test() {
        System.out.println("TEST ENDPOINT HIT!");
        return "Test endpoint works!";
    }
//
//    @PostMapping("/register")
//    public ResponseEntity<?> register(@RequestBody Staff staff) {
//        try {
//            System.out.println("Registering staff: " + staff.getEmail());
//            authService.register(staff);
//            return ResponseEntity.ok(Map.of("message", "User registered successfully"));
//        } catch (Exception e) {
//            e.printStackTrace();  // This will show you the actual error
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                    .body(Map.of("error", e.getMessage()));
//        }
//    }

    @PostMapping("login")
    public Map<String, String> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        String token = authService.login(email, password);
        return Map.of("token", token);
    }



}
