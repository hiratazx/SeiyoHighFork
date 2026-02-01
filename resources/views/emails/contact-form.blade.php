<x-mail::message>
# New Contact Form Submission

**From:** {{ $formData['name'] }}  
**Email:** {{ $formData['email'] }}  
**Subject:** {{ $formData['subject'] }}

---

## Message

{{ $formData['message'] }}

---

<x-mail::button :url="'mailto:' . $formData['email']">
Reply to {{ $formData['name'] }}
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
