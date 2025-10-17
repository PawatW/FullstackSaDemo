package com.inv.repo;

import com.inv.model.Order;
import com.inv.model.OrderItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

@Repository
public class OrderRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Order mapRow(ResultSet rs, int rowNum) throws SQLException {
        Order o = new Order();
        o.setOrderId(rs.getString("order_id")); // rs.getString
        o.setOrderDate(rs.getDate("order_date").toLocalDate());
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
        return jdbcTemplate.query("SELECT * FROM \"Order\" ORDER BY order_date DESC", this::mapRow);
    }

    public void save(Order o) {
        jdbcTemplate.update(
                "INSERT INTO \"Order\"(order_id, order_date, total_amount, status, customer_id, staff_id) VALUES (?, CURRENT_DATE, ?, ?, ?, ?)",
                o.getOrderId(), o.getTotalAmount(), o.getStatus(), o.getCustomerId(), o.getStaffId()
        );
    }

    public void saveOrderItem(OrderItem i) {
        jdbcTemplate.update(
                "INSERT INTO orderitem(order_item_id, order_id, product_id, quantity, unit_price, line_total, fulfilled_qty, remaining_qty) VALUES (?,?,?,?,?,?,?,?)",
                i.getOrderItemId(), i.getOrderId(), i.getProductId(), i.getQuantity(),
                i.getUnitPrice(), i.getLineTotal(), i.getFulfilledQty(), i.getQuantity() // remaining_qty starts equal to quantity
        );
    }

    public List<Order> findConfirmedOrders() {
        return jdbcTemplate.query("SELECT * FROM \"Order\" WHERE status = 'Confirmed'", this::mapRow);
    }

    public List<OrderItem> findItemsByOrderId(String orderId) { // รับ String orderId
        return jdbcTemplate.query("SELECT * FROM orderitem WHERE order_id = ?", this::mapRowItem, orderId);
    }

    public void updateOrderItemFulfillment(String orderId, String productId, int fulfillQty) { // รับ String IDs
        jdbcTemplate.update("UPDATE OrderItem SET fulfilled_qty = fulfilled_qty + ? WHERE order_id = ? AND product_id = ?", fulfillQty, orderId, productId);
    }

    public boolean areAllOrderItemsFulfilled(String orderId) { // รับ String orderId
        String sql = "SELECT COUNT(*) FROM OrderItem WHERE order_id = ? AND remaining_qty > 0";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, orderId);
        return count != null && count == 0;
    }

    public List<Order> findOrdersReadyToClose() {
        String sql = "SELECT * FROM \"Order\" AS o WHERE o.status = 'Confirmed' AND NOT EXISTS (SELECT 1 FROM OrderItem AS oi WHERE oi.order_id = o.order_id AND oi.remaining_qty > 0)";
        return jdbcTemplate.query(sql, this::mapRow);
    }

    public boolean hasPendingRequests(String orderId) { // รับ String orderId
        String sql = "SELECT COUNT(*) FROM Request WHERE order_id = ? AND status != 'Closed'";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, orderId);
        return count != null && count > 0;
    }

    public void closeOrder(String orderId, String staffId) { // รับ String IDs
        // แก้ไข: ลบ staffId ที่ไม่ได้ใช้ออกจาก argument ของ update
        jdbcTemplate.update("UPDATE \"Order\" SET status = 'Closed' WHERE order_id = ?", orderId);
    }
}