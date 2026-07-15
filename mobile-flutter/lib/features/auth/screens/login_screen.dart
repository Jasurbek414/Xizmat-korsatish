import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme.dart';
import '../bloc/auth_bloc.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _subdomainController = TextEditingController();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void dispose() {
    _subdomainController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: BlocConsumer<AuthBloc, AuthState>(
            listener: (context, state) {
              if (state is AuthError) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(state.message),
                    backgroundColor: AppTheme.dangerColor,
                  ),
                );
              }
            },
            builder: (context, state) {
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(),
                  // Branding & Title
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppTheme.primaryColor.withOpacity(0.2),
                        ),
                      ),
                      child: const Icon(
                        LucideIcons.layers,
                        size: 48,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Center(
                    child: Text(
                      'ServiceCore',
                      style: TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const Center(
                    child: Text(
                      'SaaS ERP Mobile Console',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Dynamic Forms depending on Auth State
                  if (state is AuthInitial ||
                      state is SubdomainChecking ||
                      state is SubdomainInvalid ||
                      state is Unauthenticated)
                    _buildSubdomainForm(context, state)
                  else
                    _buildCredentialForm(context, state),

                  const Spacer(),
                  const Center(
                    child: Text(
                      'v1.0.0 • Xavfsiz tizim',
                      style: TextStyle(
                        fontSize: 10,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildSubdomainForm(BuildContext context, AuthState state) {
    final isChecking = state is SubdomainChecking;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Kompaniya kodi (Subdomain)',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _subdomainController,
          enabled: !isChecking,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: InputDecoration(
            hintText: 'masalan: expressmail',
            prefixIcon: const Icon(
              LucideIcons.globe,
              size: 18,
              color: AppTheme.textSecondary,
            ),
            errorText: state is SubdomainInvalid ? state.message : null,
          ),
          onSubmitted: (_) => _submitSubdomain(context),
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: isChecking ? null : () => _submitSubdomain(context),
          child: isChecking
              ? const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.white,
                  ),
                )
              : const Text('Davom etish'),
        ),
      ],
    );
  }

  Widget _buildCredentialForm(BuildContext context, AuthState state) {
    String companyName = 'Kompaniya';
    String subdomain = '';
    if (state is SubdomainValid) {
      companyName = state.companyName;
      subdomain = state.subdomain;
    } else if (state is AuthLoading || state is AuthError) {
      // Keep previous subdomain parameters if in error state
      final bloc = context.read<AuthBloc>();
      if (bloc.state is SubdomainValid) {
        companyName = (bloc.state as SubdomainValid).companyName;
        subdomain = (bloc.state as SubdomainValid).subdomain;
      }
    }

    final isLoading = state is AuthLoading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  companyName,
                  style: const TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
                Text(
                  '$subdomain.servicecore.uz',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(
                LucideIcons.edit2,
                size: 16,
                color: AppTheme.textSecondary,
              ),
              onPressed: () {
                context.read<AuthBloc>().add(ResetSubdomainEvent());
              },
            ),
          ],
        ),
        const SizedBox(height: 20),
        const Text(
          'Login',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _usernameController,
          enabled: !isLoading,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            hintText: 'Foydalanuvchi nomi',
            prefixIcon: Icon(
              LucideIcons.user,
              size: 18,
              color: AppTheme.textSecondary,
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Parol',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _passwordController,
          enabled: !isLoading,
          obscureText: true,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            hintText: '••••••••',
            prefixIcon: Icon(
              LucideIcons.lock,
              size: 18,
              color: AppTheme.textSecondary,
            ),
          ),
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: isLoading ? null : () => _submitCredentials(context),
          child: isLoading
              ? const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.white,
                  ),
                )
              : const Text('Kirish'),
        ),
      ],
    );
  }

  void _submitSubdomain(BuildContext context) {
    final sub = _subdomainController.text.trim();
    if (sub.isNotEmpty) {
      context.read<AuthBloc>().add(CheckSubdomainEvent(sub));
    }
  }

  void _submitCredentials(BuildContext context) {
    final user = _usernameController.text.trim();
    final pass = _passwordController.text;
    if (user.isNotEmpty && pass.isNotEmpty) {
      context.read<AuthBloc>().add(
        LoginWithCredentialsEvent(username: user, password: pass),
      );
    }
  }
}
