import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const app = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  : getApps()[0]

const auth = getAuth(app)
const db = getFirestore(app)

async function provisionStudent() {
  const studentUid = '00NsE1l3lMXJ132z0Qs7'
  const email = '15-1-00535@dummy.edu.ph'
  const password = 'studentPass2026'
  const displayName = 'Grace Valdez'

  console.log(`\n=== Provisioning Student User ===`)
  console.log(`Target UID: ${studentUid}`)
  console.log(`Email:      ${email}`)
  console.log(`Name:       ${displayName}`)

  // 1. Check if an Auth user already exists with this email or UID
  try {
    await auth.getUser(studentUid)
    console.log(`✓ Auth user found by UID ${studentUid}. Updating credentials...`)
    await auth.updateUser(studentUid, {
      email,
      password,
      displayName,
      emailVerified: true,
      disabled: false,
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'auth/user-not-found') {
      // Check if user exists by email under a different UID
      try {
        const userByEmail = await auth.getUserByEmail(email)
        console.log(`! User exists with email ${email} but different UID (${userByEmail.uid}). Deleting mismatched user...`)
        await auth.deleteUser(userByEmail.uid)
      } catch {}

      console.log(`+ Creating new Auth user with exact UID ${studentUid}...`)
      await auth.createUser({
        uid: studentUid,
        email,
        password,
        displayName,
        emailVerified: true,
      })
      console.log(`✓ Auth user created successfully!`)
    } else {
      throw err
    }
  }

  // 2. Verify / Ensure Firestore user document has status: "approved" & isDeleted: false
  const userDocRef = db.collection('users').doc(studentUid)
  const userDoc = await userDocRef.get()

  if (userDoc.exists) {
    console.log(`✓ Firestore document users/${studentUid} exists. Ensuring approved status...`)
    await userDocRef.update({
      status: 'approved',
      isDeleted: false,
      role: 'user',
      updatedAt: new Date(),
    })
  } else {
    console.log(`+ Creating missing Firestore document users/${studentUid}...`)
    await userDocRef.set({
      studentId: '15-1-00535',
      email,
      firstName: 'Grace',
      lastName: 'Valdez',
      role: 'user',
      status: 'approved',
      isDeleted: false,
      yearLevel: '4',
      program: 'Bachelor of Secondary Education',
      faculty: 'Faculty of Teacher Education',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  console.log(`\n=== Provisioning Complete! ===`)
  console.log(`You can now sign in on the Student Portal (/login) with:`)
  console.log(`Email:    ${email}`)
  console.log(`Password: ${password}\n`)
}

provisionStudent().catch((err) => {
  console.error('Provisioning failed:', err)
  process.exit(1)
})
