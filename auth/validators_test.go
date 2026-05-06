package auth

import "testing"

func TestValidateEmailRejectsMalformedDomains(t *testing.T) {
	valid := []string{
		"alice@example.com",
		"user.name+tag@example.co",
	}
	for _, email := range valid {
		if !validateEmail(email) {
			t.Fatalf("expected %q to be valid", email)
		}
	}

	invalid := []string{
		"test@.com",
		"test@example..com",
		"test@example",
		"test@example.c",
		"test@-example.com",
		"test@example-.com",
		"User <test@example.com>",
	}
	for _, email := range invalid {
		if validateEmail(email) {
			t.Fatalf("expected %q to be invalid", email)
		}
	}
}
