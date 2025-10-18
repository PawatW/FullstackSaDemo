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
        String name = trimToNull(product.getProductName());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุชื่อสินค้า (Product name is required)");
        }

        if (product.getQuantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "จำนวนสินค้าเริ่มต้นต้องไม่น้อยกว่า 0 (Quantity must be >= 0)");
        }

        if (product.getPricePerUnit() != null && product.getPricePerUnit().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ราคา/หน่วยต้องมากกว่า 0 (Price per unit must be greater than 0)");
        }

        product.setProductId("PROD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        product.setProductName(name);
        product.setDescription(trimToNull(product.getDescription()));
        product.setUnit(trimToNull(product.getUnit()));
        product.setSupplierId(trimToNull(product.getSupplierId()));
        product.setImageUrl(trimToNull(product.getImageUrl()));

        productRepository.save(product);
        return product;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public void adjustQuantity(String productId, int diff) { // รับ String productId
        productRepository.updateQuantity(productId, diff);
    }
}
