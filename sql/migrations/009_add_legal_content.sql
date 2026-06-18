ALTER TABLE public.site_settings
  ADD COLUMN privacy_content TEXT DEFAULT '',
  ADD COLUMN terms_content TEXT DEFAULT '';

-- Seed con contenido actual de privacidad
UPDATE public.site_settings SET privacy_content = '<h2>Datos que recopilamos</h2>
<ul>
  <li>Correo electrónico y nombre básico (si inicias sesión con Google).</li>
  <li>Datos necesarios para operar tu cuenta dentro de la aplicación.</li>
</ul>

<h2>Cómo usamos tus datos</h2>
<p>Usamos esta información únicamente para autenticarte y gestionar tu cuenta dentro de Café Cortero. No vendemos tus datos.</p>

<h2>Google Sign-In</h2>
<p>No almacenamos tu contraseña de Google. El acceso se gestiona mediante OAuth y tokens de sesión.</p>

<h2>Compartición con terceros</h2>
<p>No compartimos información personal con terceros, salvo cuando sea necesario para el funcionamiento del inicio de sesión (por ejemplo, el proveedor de autenticación).</p>

<h2>Contacto</h2>
<p class="contacto">Si tienes preguntas, escríbenos a: <a href="mailto:cafecortero@gmail.com"><strong>cafecortero@gmail.com</strong></a></p>' WHERE id = 1;

UPDATE public.site_settings SET terms_content = '<p>Al utilizar Café Cortero aceptas los presentes Términos del Servicio.</p>

<h2>Uso del servicio</h2>
<p>El servicio se proporciona "tal cual", sin garantías de disponibilidad continua ni ausencia de errores.</p>

<h2>Responsabilidad del usuario</h2>
<p>El uso de la aplicación es responsabilidad exclusiva del usuario, quien se compromete a utilizarla de forma lícita y adecuada.</p>

<h2>Modificaciones</h2>
<p>Café Cortero se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor una vez publicadas.</p>' WHERE id = 1;
