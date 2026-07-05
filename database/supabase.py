from functools import lru_cache

from supabase import create_client

from config import SUPABASE_KEY, SUPABASE_PROJECT_URL, SUPABASE_SERVICE_KEY


def create_public_client():
    return create_client(SUPABASE_PROJECT_URL, SUPABASE_KEY)


@lru_cache(maxsize=1)
def get_service_client():
    return create_client(SUPABASE_PROJECT_URL, SUPABASE_SERVICE_KEY)
