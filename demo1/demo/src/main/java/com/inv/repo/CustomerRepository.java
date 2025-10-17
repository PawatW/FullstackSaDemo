package com.inv.repo;

import com.inv.model.Customer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

@Repository
public class CustomerRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Customer mapRow(ResultSet rs, int rowNum) throws SQLException {
        Customer c = new Customer();
        c.setCustomerId(rs.getString("customer_id")); // rs.getString
        c.setCustomerName(rs.getString("customer_name"));
        c.setAddress(rs.getString("address"));
        c.setPhone(rs.getString("phone"));
        c.setEmail(rs.getString("email"));
        return c;
    }

    public List<Customer> findAll() {
        return jdbcTemplate.query("SELECT * FROM Customer", this::mapRow);
    }

    public Customer findById(String id) { // รับ String id
        List<Customer> list = jdbcTemplate.query(
                "SELECT * FROM Customer WHERE customer_id = ?",
                this::mapRow,
                id
        );
        return list.isEmpty() ? null : list.get(0);
    }

    public Customer findByPhone(String phone) {
        List<Customer> list = jdbcTemplate.query("SELECT * FROM Customer WHERE phone = ?", this::mapRow, phone);
        return list.isEmpty() ? null : list.get(0);
    }

    public Customer findByEmail(String email) {
        List<Customer> list = jdbcTemplate.query("SELECT * FROM Customer WHERE email = ?", this::mapRow, email);
        return list.isEmpty() ? null : list.get(0);
    }

    // แก้ไข: save ไม่ return ค่าแล้ว และเพิ่ม customer_id ในการ insert
    public void save(Customer c) {
        String sql = "INSERT INTO Customer(customer_id, customer_name, address, phone, email) VALUES (?,?,?,?,?)";
        jdbcTemplate.update(
                sql,
                c.getCustomerId(),
                c.getCustomerName(), c.getAddress(), c.getPhone(), c.getEmail()
        );
    }
}