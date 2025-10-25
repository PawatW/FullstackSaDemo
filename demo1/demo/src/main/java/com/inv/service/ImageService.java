package com.inv.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;

@Service
public class ImageService {

    private static final Logger logger = LoggerFactory.getLogger(ImageService.class);

    private final Cloudinary cloudinary;
    private final String folder;

    public ImageService(Cloudinary cloudinary, @Value("${cloudinary.folder:inventory/products}") String folder) {
        this.cloudinary = cloudinary;
        this.folder = folder;
    }

    public String uploadProductImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาเลือกไฟล์รูปภาพที่ต้องการอัปโหลด");
        }

        if (cloudinary == null || isBlank(cloudinary.config.cloudName)) {
            logger.error("Cloudinary is not configured properly. Please check credentials.");
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "ไม่สามารถอัปโหลดรูปภาพได้ในขณะนี้");
        }

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder,
                            "resource_type", "image"
                    )
            );

            Object secureUrl = uploadResult.get("secure_url");
            if (secureUrl instanceof String secureUrlString && !secureUrlString.isBlank()) {
                return secureUrlString;
            }

            Object url = uploadResult.get("url");
            if (url instanceof String urlString && !urlString.isBlank()) {
                return urlString;
            }

            logger.error("Cloudinary upload succeeded but URL is missing. Response: {}", uploadResult);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "ไม่สามารถดึง URL ของรูปภาพได้");
        } catch (IOException e) {
            logger.error("Failed to upload image to Cloudinary", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "เกิดข้อผิดพลาดระหว่างอัปโหลดรูปภาพ");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
