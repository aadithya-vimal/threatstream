from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client() -> Client:
    """
    Initializes and returns a Supabase client using the Service Role Key.
    This grants full bypass of RLS for background job workers.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# Singleton client instance
supabase_client: Client = get_supabase_client()
