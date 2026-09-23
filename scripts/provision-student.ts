import { cert, getApps, initializeApp, type AppOptions } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Required seed inputs:
// SEED_STUDENT_UID, SEED_STUDENT_EMAIL, SEED_STUDENT_PASSWORD, SEED_STUDENT_ID,
// SEED_STUDENT_FIRST_NAME, SEED_STUDENT_LAST_NAME, SEED_STUDENT_PROGRAM_ID,
// SEED_STUDENT_FACULTY_ID, SEED_STUDENT_ORG_ID, and SEED_STUDENT_YEAR_LEVEL.
// Remote runs must also set SEED_REMOTE_PROJECT_ID to FIREBASE_PROJECT_ID exactly.
interface SeedStudent {
  uid: string
  email: string
  password: string
  studentId: string
  firstName: string
  lastName: string
  programId: string
  facultyId: string
  orgId: string
  yearLevel: number
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function readYearLevel(): number {
  const value = Number(requireEnv('SEED_STUDENT_YEAR_LEVEL'))
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error('SEED_STUDENT_YEAR_LEVEL must be an integer between 1 and 6.')
  }
  return value
}

function readSeedStudent(): SeedStudent {
  const password = requireEnv('SEED_STUDENT_PASSWORD')
  if (password.length < 6) {
    throw new Error('SEED_STUDENT_PASSWORD must contain at least 6 characters.')
  }

  return {
    uid: requireEnv('SEED_STUDENT_UID'),
    email: requireEnv('SEED_STUDENT_EMAIL'),
    password,
    studentId: requireEnv('SEED_STUDENT_ID'),
    firstName: requireEnv('SEED_STUDENT_FIRST_NAME'),
    lastName: requireEnv('SEED_STUDENT_LAST_NAME'),
    programId: requireEnv('SEED_STUDENT_PROGRAM_ID'),
    facultyId: requireEnv('SEED_STUDENT_FACULTY_ID'),
    orgId: requireEnv('SEED_STUDENT_ORG_ID'),
    yearLevel: readYearLevel(),
  }
}

function isUserNotFound(error: unknown): boolean {
  return (error as { code?: string }).code === 'auth/user-not-found'
}

const projectId = requireEnv('FIREBASE_PROJECT_ID')
const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim()
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST?.trim()

if (Boolean(authEmulatorHost) !== Boolean(firestoreEmulatorHost)) {
  throw new Error(
    'Set both FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST when seeding emulators.'
  )
}

const usingEmulators = Boolean(authEmulatorHost && firestoreEmulatorHost)
if (!usingEmulators && process.env.SEED_REMOTE_PROJECT_ID?.trim() !== projectId) {
  throw new Error(
    `Refusing to seed remote Firebase project "${projectId}". ` +
      'Set SEED_REMOTE_PROJECT_ID to that exact project ID to confirm the target.'
  )
}

const appOptions: AppOptions = usingEmulators
  ? { projectId }
  : {
      credential: cert({
        projectId,
        clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
        privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    }

const app = getApps().length === 0 ? initializeApp(appOptions) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)

async function ensureAuthUser(student: SeedStudent): Promise<void> {
  try {
    const existingUser = await auth.getUser(student.uid)
    if (existingUser.email !== student.email) {
      throw new Error(
        `Refusing to overwrite Auth user ${student.uid}: existing email does not match ` +
          'SEED_STUDENT_EMAIL.'
      )
    }

    console.log(`Auth user ${student.uid} already exists; leaving it unchanged.`)
    return
  } catch (error) {
    if (!isUserNotFound(error)) {
      throw error
    }
  }

  try {
    const userWithEmail = await auth.getUserByEmail(student.email)
    throw new Error(
      `Refusing to create ${student.uid}: email is already assigned to Auth user ` +
        `${userWithEmail.uid}.`
    )
  } catch (error) {
    if (!isUserNotFound(error)) {
      throw error
    }
  }

  await auth.createUser({
    uid: student.uid,
    email: student.email,
    password: student.password,
    displayName: `${student.firstName} ${student.lastName}`,
    emailVerified: true,
    disabled: false,
  })
  console.log(`Created Auth user ${student.uid}.`)
}

async function ensureStudentDocument(student: SeedStudent): Promise<void> {
  const userDocRef = db.collection('users').doc(student.uid)
  const userDoc = await userDocRef.get()

  if (userDoc.exists) {
    console.log(`Firestore document users/${student.uid} already exists; leaving it unchanged.`)
    return
  }

  const now = new Date()
  await userDocRef.set({
    studentId: student.studentId,
    email: student.email,
    firstName: student.firstName,
    lastName: student.lastName,
    programId: student.programId,
    facultyId: student.facultyId,
    orgId: student.orgId,
    role: 'user',
    status: 'approved',
    isDeleted: false,
    yearLevel: student.yearLevel,
    createdAt: now,
    updatedAt: now,
  })
  console.log(`Created Firestore document users/${student.uid}.`)
}

async function provisionStudent(): Promise<void> {
  const student = readSeedStudent()

  console.log(`Provisioning student ${student.uid} in Firebase project ${projectId}.`)
  console.log(usingEmulators ? 'Target: local emulators.' : 'Target: explicitly confirmed remote project.')

  await ensureAuthUser(student)
  await ensureStudentDocument(student)

  console.log(`Provisioning complete for ${student.email}.`)
}

provisionStudent().catch((error: unknown) => {
  console.error('Provisioning failed:', error)
  process.exitCode = 1
})
