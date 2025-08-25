import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // レビュー対象の映画を2つ作成
  const movie1 = await prisma.movie.upsert({
    where: { id: '1' },
    update: {},
    create: { id: '1', title: 'テスト映画1' },
  });
  const movie2 = await prisma.movie.upsert({
    where: { id: '2' },
    update: {},
    create: { id: '2', title: 'テスト映画2' },
  });

  // ユーザーとレビューを10件ずつ作成
  for (let i = 1; i <= 10; i++) {
    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        email: `seeduser${i}@example.com`,
        name: `Seed User ${i}`,
        password: 'some_hashed_password', // テスト用なので固定
        status: 'ACTIVE',
      },
    });

    // 作成したユーザーでレビューを投稿
    const review = await prisma.review.create({
      data: {
        rating: Math.floor(Math.random() * 5) + 1,
        comment_general: `ユーザー${user.name}によるテストコメントです`,
        movieId: i % 2 === 0 ? movie1.id : movie2.id, // 映画を交互に
        userId: user.id, // 今作成したユーザーのIDを使う
      },
    });
    console.log(`Created user: ${user.name} and their review.`);
  }
  console.log(`Seeding finished.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
