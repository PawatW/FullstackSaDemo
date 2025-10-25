package com.inv.repo;

import com.inv.model.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

@Repository
public class SupplierRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Supplier mapRow(ResultSet rs, int rowNum) throws SQLException {
        Supplier s = new Supplier();
        s.setSupplierId(rs.getString("supplier_id")); // rs.getString
        s.setSupplierName(rs.getString("supplier_name"));
        s.setAddress(rs.getString("address")); // แก้ไข: schema ใหม่ใช้ address
        s.setPhone(rs.getString("phone"));     // แก้ไข: schema ใหม่ใช้ phone
        s.setEmail(rs.getString("email"));
        return s;
    }

    public List<Supplier> findAll() {
        String sql = "SELECT supplier_id, supplier_name, address, phone, email FROM Supplier";
        return jdbcTemplate.query(sql, this::mapRow);
    }

    public Supplier findById(String id) { // รับ String id
        List<Supplier> list = jdbcTemplate.query(
                "SELECT supplier_id, supplier_name, address, phone, email FROM Supplier WHERE supplier_id = ?",
                this::mapRow,
                id
        );
        return list.isEmpty() ? null : list.get(0);
    }

    public Supplier findByEmail(String email) {
        String sql = "SELECT supplier_id, supplier_name, address, phone, email FROM Supplier WHERE email = ?";
        List<Supplier> list = jdbcTemplate.query(sql, this::mapRow, email);
        return list.isEmpty() ? null : list.get(0);
    }

    // แก้ไข: save ไม่ return ค่าแล้ว และเพิ่ม supplier_id ในการ insert
    public void save(Supplier s) {
        String sql = "INSERT INTO Supplier(supplier_id, supplier_name, address, phone, email) VALUES (?,?,?,?,?)";
        jdbcTemplate.update(
                sql,
                s.getSupplierId(),
                s.getSupplierName(),
                s.getAddress(),
                s.getPhone(),
                s.getEmail()
        );
    }

    public void update(String supplierId, String name, String address, String phone, String email) {
        String sql = "UPDATE Supplier SET supplier_name = ?, address = ?, phone = ?, email = ? WHERE supplier_id = ?";
        jdbcTemplate.update(sql, name, address, phone, email, supplierId);
    }
}