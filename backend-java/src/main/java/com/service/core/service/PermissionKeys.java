package com.service.core.service;

import java.util.List;

/**
 * Rolga tayinlanadigan ruxsat kalitlari - web admin panel (mavjud) va mobil ilova (yangi)
 * modullarini boshqarish uchun bitta joyda saqlanadi. Yangi mobil funksiya qo'shilganda
 * shu ro'yxatga kalit qo'shish yetarli - RolesPermissions.jsx va mobil PermissionsCubit
 * shu ro'yxatni backend orqali oladi.
 */
public final class PermissionKeys {

    // Web admin panel modullari (mavjud)
    public static final String CLIENTS = "clients";
    public static final String EMPLOYEES = "employees";
    public static final String ORDERS = "orders";
    public static final String FINANCE = "finance";
    public static final String SALARIES = "salaries";
    public static final String SETTINGS = "settings";
    public static final String MAP = "map";

    // Mobil ilova modullari (yangi)
    public static final String MOBILE_ORDERS = "mobile_orders";
    public static final String MOBILE_GPS = "mobile_gps";
    public static final String MOBILE_FINANCE_VIEW = "mobile_finance_view";
    public static final String MOBILE_TEAM_VIEW = "mobile_team_view";
    public static final String MOBILE_CHAT = "mobile_chat";
    public static final String MOBILE_SALARY_VIEW = "mobile_salary_view";

    // Specific Action Permissions
    public static final String ASSIGN_MEASUREMENT_UNIT = "assign_measurement_unit";
    public static final String UPDATE_ORDER_STATUS = "update_order_status";
    public static final String WRITE_ORDER_NOTES = "write_order_notes";
    public static final String SET_ORDER_PRICE = "set_order_price";
    public static final String RECORD_INCOME = "record_income";
    public static final String RECORD_EXPENSE = "record_expense";

    public static final List<String> ALL = List.of(
            CLIENTS, EMPLOYEES, ORDERS, FINANCE, SALARIES, SETTINGS, MAP,
            MOBILE_ORDERS, MOBILE_GPS, MOBILE_FINANCE_VIEW, MOBILE_TEAM_VIEW, MOBILE_CHAT, MOBILE_SALARY_VIEW,
            ASSIGN_MEASUREMENT_UNIT, UPDATE_ORDER_STATUS, WRITE_ORDER_NOTES, SET_ORDER_PRICE, RECORD_INCOME, RECORD_EXPENSE
    );

    private PermissionKeys() {
    }
}
