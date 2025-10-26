package com.inv.repo;

import com.inv.model.Request;
import com.inv.model.RequestItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public class RequestRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Request mapRow(ResultSet rs, int rowNum) throws SQLException {
        Request r = new Request();
        r.setRequestId(rs.getString("request_id"));
        Timestamp requestTimestamp = rs.getTimestamp("request_date");
        r.setRequestDate(requestTimestamp != null ? requestTimestamp.toLocalDateTime() : null);
        r.setStatus(rs.getString("status"));
        r.setOrderId(rs.getString("order_id"));
        r.setCustomerId(rs.getString("customer_id")); // เพิ่ม customer_id
        r.setStaffId(rs.getString("staff_id"));
        r.setDescription(rs.getString("description"));
        r.setApprovedBy(rs.getString("approved_by"));
        r.setApprovedDate(rs.getTimestamp("approved_date") != null ? rs.getTimestamp("approved_date").toLocalDateTime() : null);
        return r;
    }

    private RequestItem mapRowItem(ResultSet rs, int rowNum) throws SQLException {
        RequestItem i = new RequestItem();
        i.setRequestItemId(rs.getString("request_item_id"));
        i.setRequestId(rs.getString("request_id"));
        i.setProductId(rs.getString("product_id"));
        i.setQuantity(rs.getInt("quantity"));
        i.setFulfilledQty(rs.getInt("fulfilled_qty"));
        i.setRemainingQty(rs.getInt("remaining_qty"));
        return i;
    }

    public List<Request> findAll() {
        String sql = "SELECT request_id, request_date, status, order_id, customer_id, staff_id, description, approved_by, approved_date " +
                "FROM Request ORDER BY request_date DESC";
        return jdbcTemplate.query(sql, this::mapRow);
    }

    public List<Request> findByOrderId(String orderId) {
        String sql = "SELECT request_id, request_date, status, order_id, customer_id, staff_id, description, approved_by, approved_date " +
                "FROM request WHERE order_id = ?"; 

        // ส่ง orderId เข้าไปเป็น argument ตัวที่ 3
        return jdbcTemplate.query(sql, this::mapRow, orderId);
    }

    public void save(Request r) {
        LocalDateTime requestDate = r.getRequestDate() != null ? r.getRequestDate() : LocalDateTime.now();
        String status = r.getStatus() != null ? r.getStatus() : "Awaiting Approval";
        jdbcTemplate.update(
                "INSERT INTO request(request_id, request_date, status, order_id, customer_id, staff_id, description) VALUES (?,?,?,?,?,?,?)",
                r.getRequestId(),
                Timestamp.valueOf(requestDate),
                status,
                r.getOrderId(),
                r.getCustomerId(),
                r.getStaffId(),
                r.getDescription()
        );
    }

    public void saveRequestItem(RequestItem i) {
        jdbcTemplate.update(
                "INSERT INTO requestitem(request_item_id, request_id, product_id, quantity, fulfilled_qty) VALUES (?,?,?,?,?)",
                i.getRequestItemId(), i.getRequestId(), i.getProductId(), i.getQuantity(), 0
        );
    }

    public List<Request> findPendingRequests() {
        String sql = "SELECT request_id, request_date, status, order_id, customer_id, staff_id, description, approved_by, approved_date " +
                "FROM request WHERE status = 'Awaiting Approval'";
        return jdbcTemplate.query(sql, this::mapRow);
    }

    public RequestItem findItemById(String requestItemId) { // รับ String
        String sql = "SELECT request_item_id, request_id, product_id, quantity, fulfilled_qty, remaining_qty " +
                "FROM requestitem WHERE request_item_id = ?";
        List<RequestItem> items = jdbcTemplate.query(sql, this::mapRowItem, requestItemId);
        return items.isEmpty() ? null : items.get(0);
    }

    public Request findById(String requestId) { // รับ String
        String sql = "SELECT request_id, request_date, status, order_id, customer_id, staff_id, description, approved_by, approved_date " +
                "FROM request WHERE request_id = ?";
        List<Request> requests = jdbcTemplate.query(sql, this::mapRow, requestId);
        return requests.isEmpty() ? null : requests.get(0);
    }

    public List<Request> findApprovedRequests() {
        String sql = "SELECT r.request_id, r.request_date, r.status, r.order_id, r.customer_id, r.staff_id, r.description, r.approved_by, r.approved_date " +
                "FROM Request r WHERE r.status IN ('Approved', 'Pending') " +
                "AND EXISTS (SELECT 1 FROM RequestItem ri WHERE ri.request_id = r.request_id AND ri.remaining_qty > 0)";
        return jdbcTemplate.query(sql, this::mapRow);
    }

    public List<RequestItem> findItemsByRequestId(String requestId) { // รับ String
        String sql = "SELECT request_item_id, request_id, product_id, quantity, fulfilled_qty, remaining_qty " +
                "FROM requestitem WHERE request_id = ?";
        return jdbcTemplate.query(sql, this::mapRowItem, requestId);
    }

    public void updateItemFulfillment(String requestItemId, int fulfillQty) { // รับ String
        jdbcTemplate.update("UPDATE requestitem SET fulfilled_qty = fulfilled_qty + ? WHERE request_item_id = ?", fulfillQty, requestItemId);
    }

    public boolean areAllItemsFulfilled(String requestId) { // รับ String
        String sql = "SELECT COUNT(1) FROM requestitem WHERE request_id = ? AND remaining_qty > 0";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, requestId);
        return count != null && count == 0;
    }

    public void updateRequestStatus(String requestId, String status) { // รับ String
        jdbcTemplate.update("UPDATE request SET status = ? WHERE request_id = ?", status, requestId);
    }

    public void updateStatus(String requestId, String status, String approverId) { // รับ String
        jdbcTemplate.update("UPDATE request SET status = ?, approved_by = ?, approved_date = NOW() WHERE request_id = ?", status, approverId, requestId);
    }

    public List<Request> findReadyToCloseRequests() {
        String sql = "SELECT r.request_id, r.request_date, r.status, r.order_id, r.customer_id, r.staff_id, r.description, r.approved_by, r.approved_date " +
                "FROM Request r WHERE r.status = 'Pending' " +
                "AND NOT EXISTS (SELECT 1 FROM RequestItem ri WHERE ri.request_id = r.request_id AND ri.remaining_qty > 0)";
        return jdbcTemplate.query(sql, this::mapRow);
    }

    public void closeRequest(String requestId, String staffId) { // รับ String
        jdbcTemplate.update("UPDATE Request SET status = 'Closed' WHERE request_id = ?", requestId);
    }
}