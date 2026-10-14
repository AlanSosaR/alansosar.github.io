-- 1. Función para previsualizar el siguiente número de pedido sin incrementar el contador
CREATE OR REPLACE FUNCTION public.preview_next_order_number(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  max_existing integer;
  last_cnt integer;
BEGIN
  SELECT COALESCE(MAX(order_number), 0) INTO max_existing
  FROM public.orders
  WHERE user_id = p_user_id;

  SELECT COALESCE(last_number, 0) INTO last_cnt
  FROM public.user_order_counters
  WHERE user_id = p_user_id;

  RETURN GREATEST(max_existing, last_cnt) + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_next_order_number(uuid) TO authenticated, anon, public;

-- 2. Sincronizar todos los contadores de user_order_counters con el MAX real de orders
INSERT INTO public.user_order_counters (user_id, last_number)
SELECT user_id, COALESCE(MAX(order_number), 0)
FROM public.orders
GROUP BY user_id
ON CONFLICT (user_id)
DO UPDATE SET last_number = EXCLUDED.last_number;
