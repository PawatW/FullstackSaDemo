package com.inv.config;

import com.inv.security.JwtFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import static org.springframework.security.config.Customizer.withDefaults;
import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;

@Configuration
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Value("${cors.allowed-origins:${CORS_ALLOWED_ORIGINS:http://localhost:3000}}")
        private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // configuration.addAllowedOrigin("http://localhost:3000"); // React dev server
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        configuration.addAllowedMethod("*"); // GET, POST, PUT, DELETE
        configuration.addAllowedHeader("*");
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(withDefaults())
                .authorizeHttpRequests(request -> request
                        // Public endpoints
                        .requestMatchers("/register", "/login", "/test").permitAll()

                        // แก้ไข: ทำให้ Role เป็นตัวพิมพ์ใหญ่ทั้งหมด
                        // Technician endpoints
                        .requestMatchers(HttpMethod.POST, "/requests").hasRole("TECHNICIAN")

                        // Foreman endpoints
                        .requestMatchers(HttpMethod.GET, "/requests/pending").hasRole("FOREMAN")
                        .requestMatchers(HttpMethod.PUT, "/requests/{id}/approve").hasRole("FOREMAN")
                        .requestMatchers(HttpMethod.PUT, "/requests/{id}/reject").hasRole("FOREMAN")

                        // Authenticated endpoints (สำหรับ role อื่นๆ หรือ role ร่วม)
                        .requestMatchers(HttpMethod.GET, "/orders/confirmed").hasAnyRole("TECHNICIAN", "ADMIN", "SALES")
                        .requestMatchers(HttpMethod.GET, "/orders/{orderId}/items").hasAnyRole("TECHNICIAN", "ADMIN", "FOREMAN","SALES")
                        .requestMatchers(HttpMethod.GET, "/requests/{requestId}/items").hasAnyRole("WAREHOUSE", "ADMIN","TECHNICIAN", "FOREMAN")

                        // เพิ่ม Rule สำหรับ Warehouse
                        .requestMatchers(HttpMethod.POST, "/stock/in").hasRole("WAREHOUSE")

                        .requestMatchers(HttpMethod.POST, "/customers").hasAnyRole("ADMIN", "SALES")
                        .requestMatchers(HttpMethod.GET, "/requests").hasAnyRole("ADMIN", "SALES", "TECHNICIAN", "FOREMAN","WAREHOUSE")

                        .requestMatchers(HttpMethod.POST, "/suppliers").authenticated()

                        .requestMatchers("/staff/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/orders").hasAnyRole("SALES", "ADMIN")
                        // อนุญาตให้ warehouse สร้างสินค้าได้
                        .requestMatchers(HttpMethod.POST, "/products").hasAnyRole("WAREHOUSE","ADMIN")
                        .requestMatchers(HttpMethod.POST, "/products/upload-image").hasAnyRole("WAREHOUSE","ADMIN")
                        // อนุญาตให้ทุกคนที่ login แล้วดึงข้อมูล Category ได้
                        .requestMatchers(HttpMethod.GET, "/categories").authenticated()

                        // เพิ่ม: Rules สำหรับการปิด Request
                        .requestMatchers(HttpMethod.GET, "/requests/ready-to-close").hasAnyRole("TECHNICIAN", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/requests/{id}/close").hasAnyRole("TECHNICIAN", "ADMIN")

                        // เพิ่ม: Rules สำหรับการปิด Order โดย Sales
                        .requestMatchers(HttpMethod.GET, "/orders/ready-to-close").hasRole("SALES")
                        .requestMatchers(HttpMethod.PUT, "/orders/{orderId}/close").hasRole("SALES")

                        // เพิ่ม: Rules สำหรับ Endpoint ใหม่ (ให้ Admin เข้าถึงได้)
                        .requestMatchers(HttpMethod.GET, "/staff").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/staff").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/stock/transactions").hasAnyRole("WAREHOUSE","ADMIN")
                        .requestMatchers(HttpMethod.GET, "/stock/fulfill").hasRole("WAREHOUSE")


                        .anyRequest().authenticated()
                )
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }


}
