package com.inv.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary(
            @Value("${CLOUDINARY_URL:}") String cloudinaryUrl,
            @Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,
            @Value("${cloudinary.api-secret:}") String apiSecret
    ) {
        // 3. ตรวจสอบว่ามี CLOUDINARY_URL หรือไม่ (ซึ่ง Render จะมีให้)
        if (cloudinaryUrl != null && !cloudinaryUrl.isEmpty()) {
            // ถ้ามี ให้ใช้ URL นี้ในการสร้าง Bean (Cloudinary SDK รองรับการสร้างจาก URL โดยตรง)
            return new Cloudinary(cloudinaryUrl);
        }

        Map<String, Object> config = ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret
        );
        return new Cloudinary(config);
    }
}
