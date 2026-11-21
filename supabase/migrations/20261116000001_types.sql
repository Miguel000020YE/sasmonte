-- 0001 : types énumérés
create extension if not exists pgcrypto;

create type public.app_role           as enum ('admin', 'user');
create type public.payment_provider   as enum ('saspay', 'chariow');
create type public.payment_status     as enum ('pending', 'paid', 'failed');
create type public.credit_reason      as enum ('purchase', 'generation', 'refund', 'admin', 'signup_bonus');
create type public.generation_mode    as enum ('topic', 'reverse');
create type public.generation_status  as enum ('pending', 'processing', 'done', 'failed');
create type public.api_service        as enum ('claude', 'elevenlabs', 'serpapi');
