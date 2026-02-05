-- =====================================================
-- PUSH NOTIFICATION TRIGGER SETUP
-- =====================================================
-- This trigger calls the send-push-notification edge function
-- whenever a new notification is inserted
-- =====================================================

-- Enable http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create function to trigger push notification
CREATE OR REPLACE FUNCTION trigger_send_push_notification()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Call edge function asynchronously using pg_net
  PERFORM
    net.http_post(
      url := 'https://eaipcuvvddyrqkbmjmvw.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      ),
      timeout_milliseconds := 5000
    );
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_notification_insert_send_push ON public.notifications;

-- Create trigger on notifications table
CREATE TRIGGER on_notification_insert_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.push_sent = false)
  EXECUTE FUNCTION trigger_send_push_notification();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;

-- Verify trigger was created
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_notification_insert_send_push';
