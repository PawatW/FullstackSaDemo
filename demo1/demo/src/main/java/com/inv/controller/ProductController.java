package com.inv.controller;

import com.inv.model.Product;
import com.inv.service.ImageService;
import com.inv.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private ImageService imageService;

    @GetMapping
    public List<Product> getAllProducts() {
        return productService.getAllProducts();
    }

    @GetMapping("/{id}")
    public Product getProductById(@PathVariable String id) { // รับ String id
        return productService.getProductById(id);
    }

    @PutMapping("/{id}/adjust")
    public void adjustStock(@PathVariable String id, @RequestParam int diff) { // รับ String id
        productService.adjustQuantity(id, diff);
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Product newProduct = productService.createProduct(product);
        return ResponseEntity.ok(newProduct);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable String id, @RequestBody Product product) {
        Product updatedProduct = productService.updateProductDetails(id, product);
        return ResponseEntity.ok(updatedProduct);
    }

    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadProductImage(@RequestParam("file") MultipartFile file) {
        String imageUrl = imageService.uploadProductImage(file);
        return ResponseEntity.ok(Map.of("url", imageUrl));
    }

//    @PostMapping("/products/{id}/image")
//    public ResponseEntity<?> uploadProductImage(@PathVariable int id,
//                                                @RequestParam("file") MultipartFile file) throws IOException {
//        Product product = productService.getProductById(id);
//        product.setImageData(file.getBytes());
//        productService.saveProduct(product);
//        return ResponseEntity.ok("Uploaded successfully");
//    }
//
//    @GetMapping("/products/{id}/image")
//    public ResponseEntity<byte[]> getProductImage(@PathVariable int id) {
//        Product product = productService.getProductById(id);
//        byte[] imageData = product.getImageData();
//
//        HttpHeaders headers = new HttpHeaders();
//        headers.setContentType(MediaType.IMAGE_PNG);
//        return new ResponseEntity<>(imageData, headers, HttpStatus.OK);
//    }


}
