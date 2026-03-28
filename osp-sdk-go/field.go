package osp

// fieldElement represents an element of the field GF(2^255 - 19).
// We use a representation as 5 limbs of 51 bits each.
type fieldElement [5]uint64

const (
	maskLow51Bits = (1 << 51) - 1
)

func feZero(v *fieldElement) {
	v[0] = 0
	v[1] = 0
	v[2] = 0
	v[3] = 0
	v[4] = 0
}

func feOne(v *fieldElement) {
	v[0] = 1
	v[1] = 0
	v[2] = 0
	v[3] = 0
	v[4] = 0
}

func feFromBytes(v *fieldElement, b *[32]byte) {
	v[0] = uint64(b[0]) | uint64(b[1])<<8 | uint64(b[2])<<16 | uint64(b[3])<<24 |
		uint64(b[4])<<32 | uint64(b[5])<<40 | uint64(b[6]&7)<<48
	v[1] = uint64(b[6])>>3 | uint64(b[7])<<5 | uint64(b[8])<<13 | uint64(b[9])<<21 |
		uint64(b[10])<<29 | uint64(b[11])<<37 | uint64(b[12]&63)<<45
	v[2] = uint64(b[12])>>6 | uint64(b[13])<<2 | uint64(b[14])<<10 | uint64(b[15])<<18 |
		uint64(b[16])<<26 | uint64(b[17])<<34 | uint64(b[18])<<42 | uint64(b[19]&1)<<50
	v[3] = uint64(b[19])>>1 | uint64(b[20])<<7 | uint64(b[21])<<15 | uint64(b[22])<<23 |
		uint64(b[23])<<31 | uint64(b[24])<<39 | uint64(b[25]&15)<<47
	v[4] = uint64(b[25])>>4 | uint64(b[26])<<4 | uint64(b[27])<<12 | uint64(b[28])<<20 |
		uint64(b[29])<<28 | uint64(b[30])<<36 | uint64(b[31]&127)<<44
}

func feToBytes(s *[32]byte, v *fieldElement) {
	var t fieldElement
	t = *v
	feReduce(&t)

	s[0] = byte(t[0])
	s[1] = byte(t[0] >> 8)
	s[2] = byte(t[0] >> 16)
	s[3] = byte(t[0] >> 24)
	s[4] = byte(t[0] >> 32)
	s[5] = byte(t[0] >> 40)
	s[6] = byte(t[0]>>48) | byte(t[1]<<3)
	s[7] = byte(t[1] >> 5)
	s[8] = byte(t[1] >> 13)
	s[9] = byte(t[1] >> 21)
	s[10] = byte(t[1] >> 29)
	s[11] = byte(t[1] >> 37)
	s[12] = byte(t[1]>>45) | byte(t[2]<<6)
	s[13] = byte(t[2] >> 2)
	s[14] = byte(t[2] >> 10)
	s[15] = byte(t[2] >> 18)
	s[16] = byte(t[2] >> 26)
	s[17] = byte(t[2] >> 34)
	s[18] = byte(t[2] >> 42)
	s[19] = byte(t[2]>>50) | byte(t[3]<<1)
	s[20] = byte(t[3] >> 7)
	s[21] = byte(t[3] >> 15)
	s[22] = byte(t[3] >> 23)
	s[23] = byte(t[3] >> 31)
	s[24] = byte(t[3] >> 39)
	s[25] = byte(t[3]>>47) | byte(t[4]<<4)
	s[26] = byte(t[4] >> 4)
	s[27] = byte(t[4] >> 12)
	s[28] = byte(t[4] >> 20)
	s[29] = byte(t[4] >> 28)
	s[30] = byte(t[4] >> 36)
	s[31] = byte(t[4] >> 44)
}

func feReduce(v *fieldElement) {
	// Carry propagation.
	v[1] += v[0] >> 51
	v[0] &= maskLow51Bits
	v[2] += v[1] >> 51
	v[1] &= maskLow51Bits
	v[3] += v[2] >> 51
	v[2] &= maskLow51Bits
	v[4] += v[3] >> 51
	v[3] &= maskLow51Bits
	v[0] += (v[4] >> 51) * 19
	v[4] &= maskLow51Bits

	// Second carry pass.
	v[1] += v[0] >> 51
	v[0] &= maskLow51Bits
	v[2] += v[1] >> 51
	v[1] &= maskLow51Bits
	v[3] += v[2] >> 51
	v[2] &= maskLow51Bits
	v[4] += v[3] >> 51
	v[3] &= maskLow51Bits
	v[0] += (v[4] >> 51) * 19
	v[4] &= maskLow51Bits

	// Subtract p if v >= p.
	// p = 2^255 - 19 = {2^51-19, 2^51-1, 2^51-1, 2^51-1, 2^51-1}
	c := (v[0] + 19) >> 51
	c = (v[1] + c) >> 51
	c = (v[2] + c) >> 51
	c = (v[3] + c) >> 51
	c = (v[4] + c) >> 51

	v[0] += 19 * c
	v[1] += v[0] >> 51
	v[0] &= maskLow51Bits
	v[2] += v[1] >> 51
	v[1] &= maskLow51Bits
	v[3] += v[2] >> 51
	v[2] &= maskLow51Bits
	v[4] += v[3] >> 51
	v[3] &= maskLow51Bits
	v[4] &= maskLow51Bits
}

func feAdd(out, a, b *fieldElement) {
	out[0] = a[0] + b[0]
	out[1] = a[1] + b[1]
	out[2] = a[2] + b[2]
	out[3] = a[3] + b[3]
	out[4] = a[4] + b[4]
}

func feSub(out, a, b *fieldElement) {
	// Add 2p to avoid underflow.
	out[0] = (a[0] + 0xFFFFFFFFFFFDA) - b[0]
	out[1] = (a[1] + 0xFFFFFFFFFFFFE) - b[1]
	out[2] = (a[2] + 0xFFFFFFFFFFFFE) - b[2]
	out[3] = (a[3] + 0xFFFFFFFFFFFFE) - b[3]
	out[4] = (a[4] + 0xFFFFFFFFFFFFE) - b[4]
}

func feMul(out, a, b *fieldElement) {
	// Schoolbook multiplication with reduction.
	a0, a1, a2, a3, a4 := a[0], a[1], a[2], a[3], a[4]
	b0, b1, b2, b3, b4 := b[0], b[1], b[2], b[3], b[4]

	// Precompute 19*b[i] for reduction.
	b1_19 := b1 * 19
	b2_19 := b2 * 19
	b3_19 := b3 * 19
	b4_19 := b4 * 19

	// Compute products using uint128 emulation via two uint64s.
	// We split each multiplication into high and low parts.
	// For simplicity, we use the fact that our limbs are at most 51 bits,
	// so products fit in ~102 bits. We accumulate into 128-bit values.
	var s0, s1, s2, s3, s4 uint128

	s0 = mul64(a0, b0)
	s0 = add128(s0, mul64(a1, b4_19))
	s0 = add128(s0, mul64(a2, b3_19))
	s0 = add128(s0, mul64(a3, b2_19))
	s0 = add128(s0, mul64(a4, b1_19))

	s1 = mul64(a0, b1)
	s1 = add128(s1, mul64(a1, b0))
	s1 = add128(s1, mul64(a2, b4_19))
	s1 = add128(s1, mul64(a3, b3_19))
	s1 = add128(s1, mul64(a4, b2_19))

	s2 = mul64(a0, b2)
	s2 = add128(s2, mul64(a1, b1))
	s2 = add128(s2, mul64(a2, b0))
	s2 = add128(s2, mul64(a3, b4_19))
	s2 = add128(s2, mul64(a4, b3_19))

	s3 = mul64(a0, b3)
	s3 = add128(s3, mul64(a1, b2))
	s3 = add128(s3, mul64(a2, b1))
	s3 = add128(s3, mul64(a3, b0))
	s3 = add128(s3, mul64(a4, b4_19))

	s4 = mul64(a0, b4)
	s4 = add128(s4, mul64(a1, b3))
	s4 = add128(s4, mul64(a2, b2))
	s4 = add128(s4, mul64(a3, b1))
	s4 = add128(s4, mul64(a4, b0))

	// Carry propagation.
	c0 := shr128(s0, 51)
	out[0] = lo128(s0) & maskLow51Bits

	s1 = add128(s1, c0)
	c1 := shr128(s1, 51)
	out[1] = lo128(s1) & maskLow51Bits

	s2 = add128(s2, c1)
	c2 := shr128(s2, 51)
	out[2] = lo128(s2) & maskLow51Bits

	s3 = add128(s3, c2)
	c3 := shr128(s3, 51)
	out[3] = lo128(s3) & maskLow51Bits

	s4 = add128(s4, c3)
	c4 := shr128(s4, 51)
	out[4] = lo128(s4) & maskLow51Bits

	out[0] += lo128(c4) * 19
	out[1] += out[0] >> 51
	out[0] &= maskLow51Bits
}

func feSquare(out, a *fieldElement) {
	feMul(out, a, a)
}

// feInvert computes out = 1/z mod p using Fermat's little theorem: z^(p-2).
func feInvert(out, z *fieldElement) {
	var t0, t1, t2, t3 fieldElement

	feSquare(&t0, z)        // t0 = z^2
	feSquare(&t1, &t0)      // t1 = z^4
	feSquare(&t1, &t1)      // t1 = z^8
	feMul(&t1, z, &t1)      // t1 = z^9
	feMul(&t0, &t0, &t1)    // t0 = z^11
	feSquare(&t2, &t0)      // t2 = z^22
	feMul(&t1, &t1, &t2)    // t1 = z^31 = z^(2^5-1)
	feSquare(&t2, &t1)      // t2 = z^(2^6-2)
	for i := 0; i < 4; i++ {
		feSquare(&t2, &t2)
	}
	feMul(&t1, &t2, &t1) // t1 = z^(2^10-1)
	feSquare(&t2, &t1)
	for i := 0; i < 9; i++ {
		feSquare(&t2, &t2)
	}
	feMul(&t2, &t2, &t1) // t2 = z^(2^20-1)
	feSquare(&t3, &t2)
	for i := 0; i < 19; i++ {
		feSquare(&t3, &t3)
	}
	feMul(&t2, &t3, &t2) // t2 = z^(2^40-1)
	feSquare(&t2, &t2)
	for i := 0; i < 9; i++ {
		feSquare(&t2, &t2)
	}
	feMul(&t1, &t2, &t1) // t1 = z^(2^50-1)
	feSquare(&t2, &t1)
	for i := 0; i < 49; i++ {
		feSquare(&t2, &t2)
	}
	feMul(&t2, &t2, &t1) // t2 = z^(2^100-1)
	feSquare(&t3, &t2)
	for i := 0; i < 99; i++ {
		feSquare(&t3, &t3)
	}
	feMul(&t2, &t3, &t2) // t2 = z^(2^200-1)
	feSquare(&t2, &t2)
	for i := 0; i < 49; i++ {
		feSquare(&t2, &t2)
	}
	feMul(&t1, &t2, &t1) // t1 = z^(2^250-1)
	feSquare(&t1, &t1)
	feSquare(&t1, &t1)    // t1 = z^(2^252-4)
	feMul(&t1, &t1, z)    // Not quite right yet...

	// We need z^(p-2) = z^(2^255 - 21).
	// Restart with a known correct addition chain.
	fePow2255m21(out, z)
}

// fePow2255m21 computes z^(2^255 - 21) = z^(p - 2) using an addition chain.
func fePow2255m21(out, z *fieldElement) {
	// Addition chain for 2^255 - 21.
	var z2, z9, z11, z_5_0, z_10_0, z_20_0, z_40_0, z_50_0, z_100_0, t fieldElement

	feSquare(&z2, z)           // z^2
	feSquare(&t, &z2)          // z^4
	feSquare(&t, &t)           // z^8
	feMul(&z9, &t, z)          // z^9
	feMul(&z11, &z9, &z2)     // z^11
	feSquare(&t, &z11)         // z^22
	feMul(&z_5_0, &t, &z9)    // z^31 = z^(2^5-1)

	feSquare(&t, &z_5_0)
	for i := 0; i < 4; i++ {
		feSquare(&t, &t)
	}
	feMul(&z_10_0, &t, &z_5_0) // z^(2^10-1)

	feSquare(&t, &z_10_0)
	for i := 0; i < 9; i++ {
		feSquare(&t, &t)
	}
	feMul(&z_20_0, &t, &z_10_0) // z^(2^20-1)

	feSquare(&t, &z_20_0)
	for i := 0; i < 19; i++ {
		feSquare(&t, &t)
	}
	feMul(&t, &t, &z_20_0) // z^(2^40-1)

	feSquare(&t, &t)
	for i := 0; i < 9; i++ {
		feSquare(&t, &t)
	}
	feMul(&z_50_0, &t, &z_10_0) // z^(2^50-1)
	z_40_0 = z_50_0              // reuse

	feSquare(&t, &z_50_0)
	for i := 0; i < 49; i++ {
		feSquare(&t, &t)
	}
	feMul(&z_100_0, &t, &z_50_0) // z^(2^100-1)

	feSquare(&t, &z_100_0)
	for i := 0; i < 99; i++ {
		feSquare(&t, &t)
	}
	feMul(&t, &t, &z_100_0) // z^(2^200-1)

	feSquare(&t, &t)
	for i := 0; i < 49; i++ {
		feSquare(&t, &t)
	}
	feMul(&t, &t, &z_50_0) // z^(2^250-1)

	feSquare(&t, &t)        // z^(2^251-2)
	feSquare(&t, &t)        // z^(2^252-4)
	feSquare(&t, &t)        // z^(2^253-8)
	feSquare(&t, &t)        // z^(2^254-16)
	feSquare(&t, &t)        // z^(2^255-32)
	feMul(out, &t, &z11)    // z^(2^255-21) = z^(p-2)

	_ = z_40_0 // suppress unused
}

// uint128 emulation for 128-bit intermediate products.
type uint128 struct {
	lo, hi uint64
}

func mul64(a, b uint64) uint128 {
	// Split into 32-bit halves.
	aLo := a & 0xFFFFFFFF
	aHi := a >> 32
	bLo := b & 0xFFFFFFFF
	bHi := b >> 32

	ll := aLo * bLo
	lh := aLo * bHi
	hl := aHi * bLo
	hh := aHi * bHi

	mid := lh + (ll >> 32)
	mid += hl

	// If mid < hl, there was a carry.
	var carry uint64
	if mid < hl {
		carry = 1
	}

	lo := (mid << 32) | (ll & 0xFFFFFFFF)
	hi := hh + (mid >> 32) + (carry << 32)

	return uint128{lo: lo, hi: hi}
}

func add128(a, b uint128) uint128 {
	lo := a.lo + b.lo
	var carry uint64
	if lo < a.lo {
		carry = 1
	}
	hi := a.hi + b.hi + carry
	return uint128{lo: lo, hi: hi}
}

func shr128(v uint128, n uint) uint128 {
	if n >= 64 {
		return uint128{lo: v.hi >> (n - 64), hi: 0}
	}
	lo := (v.lo >> n) | (v.hi << (64 - n))
	hi := v.hi >> n
	return uint128{lo: lo, hi: hi}
}

func lo128(v uint128) uint64 {
	return v.lo
}
