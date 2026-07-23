import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/constants.dart';
import '../../../core/theme.dart';
import '../bloc/auth_bloc.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _subdomainController = TextEditingController();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _subdomainController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Container(
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [
                    const Color(0xFF0D1117),
                    const Color(0xFF161B22),
                    const Color(0xFF0B6B4F).withOpacity(0.3),
                  ]
                : [
                    const Color(0xFF0B6B4F),
                    const Color(0xFF08543E),
                    const Color(0xFF0A7A56),
                  ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: BlocConsumer<AuthBloc, AuthState>(
                listener: (context, state) {
                  if (state is AuthError) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Row(
                          children: [
                            const Icon(LucideIcons.alertCircle,
                                color: Colors.white, size: 18),
                            const SizedBox(width: 10),
                            Expanded(child: Text(state.message)),
                          ],
                        ),
                        backgroundColor: AppTheme.dangerColor,
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    );
                  }
                },
                builder: (context, state) {
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // --- Brand Section ---
                      _buildBrand(isDark),
                      const SizedBox(height: 40),

                      // --- Form Section ---
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF161B22).withOpacity(0.95)
                              : Colors.white.withOpacity(0.95),
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.15),
                              blurRadius: 40,
                              offset: const Offset(0, 20),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (state is AuthInitial ||
                                state is SubdomainChecking ||
                                state is SubdomainInvalid ||
                                state is Unauthenticated)
                              _buildSubdomainForm(context, state, isDark)
                            else
                              _buildCredentialForm(
                                  context, state, isDark),
                          ],
                        ),
                      ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.1),

                      const SizedBox(height: 24),
                      // --- Version ---
                      Text(
                        'v2.1.0  •  SaaS ERP Mobile Console',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark
                              ? AppTheme.darkTextMutedColor
                              : Colors.white.withOpacity(0.7),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBrand(bool isDark) {
    return Column(
      children: [
        // Animated logo
        AnimatedBuilder(
          animation: _pulseController,
          builder: (context, child) {
            return Transform.scale(
              scale: 1 + (_pulseController.value * 0.05),
              child: child,
            );
          },
          child: Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: isDark
                  ? const Color(0xFF21262D)
                  : Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
              border: Border.all(
                color: isDark
                    ? AppTheme.primary.withOpacity(0.5)
                    : Colors.white.withOpacity(0.3),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primary.withOpacity(0.4),
                  blurRadius: 30,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Icon(
              LucideIcons.layers,
              size: 36,
              color: isDark ? AppTheme.primary : Colors.white,
            ),
          ),
        ).animate().fadeIn(duration: 800.ms).scaleXY(begin: 0.5),
        const SizedBox(height: 16),
        Text(
          'ServiceCore',
          style: GoogleFonts.outfit(
            fontSize: 32,
            fontWeight: FontWeight.w800,
            color: isDark ? AppTheme.darkTextPrimaryColor : Colors.white,
            letterSpacing: -0.5,
          ),
        ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.2),
        const SizedBox(height: 4),
        Text(
          'SaaS ERP Mobile Console',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: isDark ? AppTheme.darkTextSecondaryColor : Colors.white.withOpacity(0.8),
            letterSpacing: 1,
          ),
        ).animate().fadeIn(duration: 600.ms, delay: 200.ms).slideX(begin: 0.2),
      ],
    );
  }

  Widget _buildSubdomainForm(
      BuildContext context, AuthState state, bool isDark) {
    final isChecking = state is SubdomainChecking;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(LucideIcons.building2,
                  size: 16, color: AppTheme.primary),
            ),
            const SizedBox(width: 10),
            Text(
              'Kompaniya kodi',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _subdomainController,
          enabled: !isChecking,
          style: TextStyle(
            color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary,
            fontSize: 14,
          ),
          decoration: InputDecoration(
            hintText: 'masalan: expressmail',
            hintStyle: TextStyle(
              color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMuted,
            ),
            prefixIcon: Icon(
              LucideIcons.globe,
              size: 18,
              color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMuted,
            ),
            suffixText: '.' + AppConstants.companyDomainSuffix,
            suffixStyle: TextStyle(
              color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMuted,
              fontSize: 12,
            ),
            errorText: state is SubdomainInvalid ? state.message : null,
            filled: true,
            fillColor: isDark
                ? const Color(0xFF21262D)
                : const Color(0xFFF7F9F7),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: isDark
                    ? const Color(0xFF30363D)
                    : const Color(0xFFE4E9E5),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: isDark
                    ? const Color(0xFF30363D)
                    : const Color(0xFFE4E9E5),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide:
                  const BorderSide(color: AppTheme.primary, width: 1.5),
            ),
          ),
          onSubmitted: (_) => _submitSubdomain(context),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: FilledButton(
            onPressed: isChecking ? null : () => _submitSubdomain(context),
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.primary,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            child: isChecking
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Davom etish',
                          style: TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 15)),
                      const SizedBox(width: 8),
                      const Icon(LucideIcons.arrowRight, size: 18),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildCredentialForm(
      BuildContext context, AuthState state, bool isDark) {
    String companyName = 'Kompaniya';
    String subdomain = '';
    if (state is SubdomainValid) {
      companyName = state.companyName;
      subdomain = state.subdomain;
    } else if (state is AuthLoading || state is AuthError) {
      final bloc = context.read<AuthBloc>();
      if (bloc.state is SubdomainValid) {
        companyName = (bloc.state as SubdomainValid).companyName;
        subdomain = (bloc.state as SubdomainValid).subdomain;
      }
    }

    final isLoading = state is AuthLoading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Company header
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.primary.withOpacity(0.08),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(LucideIcons.building2,
                    size: 20, color: AppTheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      companyName,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: isDark
                            ? AppTheme.darkTextPrimaryColor
                            : AppTheme.textPrimary,
                      ),
                    ),
                    Text(
                      '$subdomain.${AppConstants.companyDomainSuffix}',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark
                            ? AppTheme.darkTextSecondaryColor
                            : AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  LucideIcons.edit2,
                  size: 16,
                  color: isDark
                      ? AppTheme.darkTextMutedColor
                      : AppTheme.textMuted,
                ),
                onPressed: () {
                  context.read<AuthBloc>().add(ResetSubdomainEvent());
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Username
        Text(
          'Login',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _usernameController,
          enabled: !isLoading,
          style: TextStyle(
            color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary,
            fontSize: 14,
          ),
          decoration: InputDecoration(
            hintText: 'Foydalanuvchi nomi',
            hintStyle: TextStyle(
              color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMuted,
            ),
            prefixIcon: Icon(
              LucideIcons.user,
              size: 18,
              color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMuted,
            ),
            filled: true,
            fillColor: isDark
                ? const Color(0xFF21262D)
                : const Color(0xFFF7F9F7),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: isDark
                    ? const Color(0xFF30363D)
                    : const Color(0xFFE4E9E5),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: isDark
                    ? const Color(0xFF30363D)
                    : const Color(0xFFE4E9E5),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide:
                  const BorderSide(color: AppTheme.primary, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Password
        Text(
          'Parol',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _passwordController,
          enabled: !isLoading,
          obscureText: true,
          style: TextStyle(
            color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimary,
            fontSize: 14,
          ),
          decoration: InputDecoration(
            hintText: '••••••••',
            hintStyle: TextStyle(
              color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMuted,
            ),
            prefixIcon: Icon(
              LucideIcons.lock,
              size: 18,
              color: isDark ? AppTheme.darkTextMutedColor : AppTheme.textMuted,
            ),
            filled: true,
            fillColor: isDark
                ? const Color(0xFF21262D)
                : const Color(0xFFF7F9F7),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: isDark
                    ? const Color(0xFF30363D)
                    : const Color(0xFFE4E9E5),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: isDark
                    ? const Color(0xFF30363D)
                    : const Color(0xFFE4E9E5),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide:
                  const BorderSide(color: AppTheme.primary, width: 1.5),
            ),
          ),
          onSubmitted: (_) {
            if (!isLoading) _submitCredentials(context);
          },
        ),
        const SizedBox(height: 24),

        SizedBox(
          width: double.infinity,
          height: 50,
          child: FilledButton(
            onPressed: isLoading ? null : () => _submitCredentials(context),
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.primary,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.logIn, size: 18),
                      const SizedBox(width: 8),
                      const Text('Kirish',
                          style: TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 15)),
                    ],
                  ),
          ),
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
