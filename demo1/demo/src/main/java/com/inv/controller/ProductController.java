package com.inv.controller;

import com.inv.model.Product;
import com.inv.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
public class ProductController {

    @Autowired
    private ProductService productService;

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
