-- Eliminar primer registro a nombre de Mabel y limpiar finanzas, notificaciones y contadores
DELETE FROM public.order_items WHERE order_id = '79a8a852-5a95-4abf-8e95-8568b210452f';
DELETE FROM public.finanzas_movimientos WHERE order_id = '79a8a852-5a95-4abf-8e95-8568b210452f';
DELETE FROM public.notifications WHERE metadata->>'order_id' = '79a8a852-5a95-4abf-8e95-8568b210452f' OR message ILIKE '%mabel%';
DELETE FROM public.orders WHERE id = '79a8a852-5a95-4abf-8e95-8568b210452f';
UPDATE public.products SET stock = stock + 20 WHERE id = '8ce52037-8287-4e06-9104-c387585e4626';

DELETE FROM public.user_order_counters WHERE user_id = '5ce63543-d138-487f-adb7-5d2f9f18ad48';
