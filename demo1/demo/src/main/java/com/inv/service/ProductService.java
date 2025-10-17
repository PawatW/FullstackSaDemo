package com.inv.service;

import com.inv.model.Product;
import com.inv.repo.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product getProductById(String id) { // รับ String id
        return productRepository.findById(id);
    }

    public Product createProduct(Product product) {
        // ... (Validation เดิม)

        // เพิ่ม: สร้าง ID ที่นี่
        String productId = "PROD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        product.setProductId(productId);

        productRepository.save(product);
        return product;
    }

    public void adjustQuantity(String productId, int diff) { // รับ String productId
        productRepository.updateQuantity(productId, diff);
    }
}
