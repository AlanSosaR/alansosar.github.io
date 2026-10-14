-- Sincronizar y hacer a prueba de fallos la generación del número de pedido consecutivo por usuario
CREATE OR REPLACE FUNCTION public.next_order_number(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  max_existing integer;
  new_number integer;
BEGIN
  -- Obtener el número máximo real en orders para este usuario
  SELECT COALESCE(MAX(order_number), 0) INTO max_existing
  FROM public.orders
  WHERE user_id = p_user_id;

  -- Insertar o actualizar el contador garantizando que sea superior al máximo existente
  INSERT INTO public.user_order_counters (user_id, last_number)
  VALUES (p_user_id, max_existing + 1)
  ON CONFLICT (user_id)
  DO UPDATE SET last_number = GREATEST(user_order_counters.last_number, max_existing) + 1
  RETURNING last_number INTO new_number;

  RETURN new_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_order_number(uuid) TO authenticated, anon, public;
