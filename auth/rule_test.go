package auth

import "testing"

func TestFormatQuotaValue(t *testing.T) {
	tests := []struct {
		name  string
		value float32
		want  string
	}{
		{name: "zero", value: 0, want: "0.0000"},
		{name: "tiny positive", value: 0.00001, want: "<0.0001"},
		{name: "tiny negative", value: -0.00001, want: "<0.0001"},
		{name: "small precision", value: 0.0003, want: "0.0003"},
		{name: "small four decimals", value: 0.0099, want: "0.0099"},
		{name: "normal four decimals", value: 0.0123, want: "0.0123"},
		{name: "larger four decimals", value: 0.08, want: "0.0800"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := formatQuotaValue(tt.value); got != tt.want {
				t.Fatalf("formatQuotaValue(%v) = %q, want %q", tt.value, got, tt.want)
			}
		})
	}
}
