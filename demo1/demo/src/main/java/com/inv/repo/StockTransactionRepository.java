package com.inv.repo;

import com.inv.model.StockTransaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

@Repository
public class StockTransactionRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private StockTransaction mapRow(ResultSet rs, int rowNum) throws SQLException {
        StockTransaction st = new StockTransaction();
        st.setTransactionId(rs.getString("transaction_id")); // rs.getString
        st.setTransactionDate(rs.getTimestamp("transaction_date").toLocalDateTime());
        st.setType(rs.getString("type"));
        st.setProductId(rs.getString("product_id"));         // rs.getString
        st.setQuantity(rs.getInt("quantity"));
        st.setStaffId(rs.getString("staff_id"));           // rs.getString
        st.setDescription(rs.getString("description"));       // แก้เป็น description
        return st;
    }

    public void save(StockTransaction transaction) {
        // แก้ไข: เพิ่ม transaction_id และเปลี่ยน reference เป็น description
        jdbcTemplate.update(
                "INSERT INTO StockTransaction(transaction_id, type, product_id, quantity, staff_id, description) VALUES (?, ?, ?, ?, ?, ?)",
                transaction.getTransactionId(),
                transaction.getType(),
                transaction.getProductId(),
                transaction.getQuantity(),
                transaction.getStaffId(),
                transaction.getDescription()
        );
    }

    public List<StockTransaction> findAll() {
        return jdbcTemplate.query("SELECT * FROM StockTransaction ORDER BY transaction_date DESC", this::mapRow);
    }
}