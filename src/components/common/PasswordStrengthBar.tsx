import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { calculatePasswordStrength } from '../../utils/validation';
import { theme } from '../../constants/theme';

interface PasswordStrengthBarProps {
  passwordText: string;
}

export const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({ passwordText }) => {
  if (!passwordText) return null;

  const strength = calculatePasswordStrength(passwordText);

  // Số vạch sáng tương ứng theo docs: Yếu -> 1/5, Trung bình -> 3/5, Mạnh -> 5/5
  const activeBars = strength.score === 1 ? 1 : strength.score === 2 ? 3 : 5;

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {[1, 2, 3, 4, 5].map((index) => {
          const isActive = index <= activeBars;
          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  backgroundColor: isActive ? strength.color : theme.colors.border,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.labelRow}>
        <Text style={styles.labelText}>Độ mạnh: </Text>
        <Text style={[styles.strengthValue, { color: strength.color }]}>
          {strength.label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: -8,
    marginBottom: 14,
  },
  barsContainer: {
    flexDirection: 'row',
    height: 4,
    gap: 4,
    marginBottom: 6,
  },
  bar: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  strengthValue: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
});
