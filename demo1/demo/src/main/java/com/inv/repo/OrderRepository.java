package com.inv.repo;

import com.inv.model.Order;
import com.inv.model.OrderItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public class OrderRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Order mapRow(ResultSet rs, int rowNum) throws SQLException {
        Order o = new Order();
        o.setOrderId(rs.getString("order_id")); // rs.getString
        Timestamp orderTimestamp = rs.getTimestamp("order_date");
        o.setOrderDate(orderTimestamp != null ? orderTimestamp.toLocalDateTime() : null);
        o.setTotalAmount(rs.getBigDecimal("total_amount"));
        o.setStatus(rs.getString("status"));
        o.setCustomerId(rs.getString("customer_id")); // rs.getString
        o.setStaffId(rs.getString("staff_id"));       // rs.getString
        return o;
    }

    private OrderItem mapRowItem(ResultSet rs, int rowNum) throws SQLException {
        OrderItem i = new OrderItem();
        i.setOrderItemId(rs.getString("order_item_id")); // rs.getString
        i.setOrderId(rs.getString("order_id"));         // rs.getString
        i.setProductId(rs.getString("product_id"));     // rs.getString
        i.setQuantity(rs.getInt("quantity"));
        i.setUnitPrice(rs.getBigDecimal("unit_price"));
        i.setLineTotal(rs.getBigDecimal("line_total"));
        i.setFulfilledQty(rs.getInt("fulfilled_qty"));
        i.setRemainingQty(rs.getInt("remaining_qty"));
        return i;
    }

    public List<Order> findAll() {
        String sql = "SELECT order_id, order_date, total_amount, status, customer_id, staff_id " +
                "FROM \"Order\" ORDER BY order_date DESC";
        return jdbcTemplate.query(sql, this::mapRow);
    }

    public void save(Order o) {
        LocalDateTime orderDate = o.getOrderDate() != null ? o.getOrderDate() : LocalDateTime.now();
        jdbcTemplate.update(
                "INSERT INTO \"Order\"(order_id, order_date, total_amount, status, customer_id, staff_id) VALUES (?,?,?,?,?,?)",
                o.getOrderId(),
                Timestamp.valueOf(orderDate),
                o.getTotalAmount(),
                o.getStatus(),
                o.getCustomerId(),
                o.getStaffId()
        );
    }

    public void saveOrderItem(OrderItem item) {
        String sql = "INSERT INTO orderitem(order_item_id, order_id, product_id, quantity, unit_price, line_total, " +
                "fulfilled_qty) VALUES (?,?,?,?,?,?,?)"; // <-- ลบ remaining_qty ออก
        jdbcTemplate.update(sql, item.getOrderItemId(), item.getOrderId(), item.getProductId(), item.getQuantity(),
                item.getUnitPrice(), item.getLineTotal(), item.getFulfilledQty()); // <-- ลบ getRemainingQty() ออก
    }

    public List<Order> findConfirmedOrders() {
        String sql = "SELECT order_id, order_date, total_amount, status, customer_id, staff_id " +
                "FROM \"Order\" WHERE status = 'Confirmed'";
        return jdbcTemplate.query(sql, this::mapRow);
    }

    public List<OrderItem> findItemsByOrderId(String orderId) { // รับ String orderId
        String sql = "SELECT order_item_id, order_id, product_id, quantity, unit_price, line_total, fulfilled_qty, remaining_qty " +
                "FROM orderitem WHERE order_id = ?";
        return jdbcTemplate.query(sql, this::mapRowItem, orderId);
    }

    public void updateOrderItemFulfillment(String orderId, String productId, int fulfillQty) {
        // 1. อัปเดตจำนวนที่เบิกแล้วในตาราง OrderItem (โค้ดเดิมของคุณ)
        jdbcTemplate.update(
                "UPDATE OrderItem SET fulfilled_qty = fulfilled_qty + ? WHERE order_id = ? AND product_id = ?",
                fulfillQty,
                orderId,
                productId
        );

        // 2. อัปเดตสถานะของ Order หลักในตาราง Orders ให้เป็น 'Pending'
        jdbcTemplate.update(
                "UPDATE \"Order\" SET status = 'Pending' WHERE order_id = ?",
                orderId
        );
    }

    public boolean areAllOrderItemsFulfilled(String orderId) { // รับ String orderId
        String sql = "SELECT COUNT(1) FROM OrderItem WHERE order_id = ? AND remaining_qty > 0";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, orderId);
        return count != null && count == 0;
    }

    public List<Order> findOrdersReadyToClose() {
        String sql = "SELECT o.order_id, o.order_date, o.total_amount, o.status, o.customer_id, o.staff_id " +
                "FROM \"Order\" AS o WHERE o.status = 'Pending' " +
                "AND NOT EXISTS (SELECT 1 FROM OrderItem AS oi WHERE oi.order_id = o.order_id AND oi.remaining_qty > 0)";
        return jdbcTemplate.query(sql, this::mapRow);
    }

    public boolean hasPendingRequests(String orderId) { // รับ String orderId
        String sql = "SELECT COUNT(1) FROM Request WHERE order_id = ? AND status != 'Closed'";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, orderId);
        return count != null && count > 0;
    }

    public void closeOrder(String orderId, String staffId) { // รับ String IDs
        // แก้ไข: ลบ staffId ที่ไม่ได้ใช้ออกจาก argument ของ update
        jdbcTemplate.update("UPDATE \"Order\" SET status = 'Closed' WHERE order_id = ?", orderId);
    }
}