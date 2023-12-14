import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserDto,
  EditUserDto,
} from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { prisma, Role, User, UserPoint, UserRole } from "@prisma/client";
import { ResponseDto } from '../Response.dto';
import { AddAuthDto } from './dto/add-auth.dto';
import { UserResponseDto } from './dto/user.response.dto';
import { AddAuthInforDto } from './dto/add-auth-infor.dto';
import { generalPassword } from "../password";
import { log } from 'console';
import { UserinforResponseDto } from './dto/userinfor.response.dto';

@Injectable()
export class UserService {

  constructor(private prisma: PrismaService) {}

  async editUser(
    userId: number,
    dto: EditUserDto,
  ) {
    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...dto,
      },
    });

    delete user.hash;

    return user;
  }

  async createUser(
    user: User,
    dto: CreateUserDto,
  ) {
    const userId = user.id;

    //---------- Function for create user ---------------------//
    async function createAccountForALlRole(
      dto: CreateUserDto,
      prisma,
    ) {
      // generate the password hash
      const hash: string = await argon.hash(
        generalPassword,
      );

      // save the new user in the db
      try {
        const user: User =
          await prisma.user.create({
            data: {
              email: dto.email,
              hash,
              username: dto.username,
              password:
                generalPassword,
            },
          });

        const createUserRole =
          await prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: dto.roleId,
            },
          });

        return 'ok';
      } catch (error) {
        if (
          error instanceof
          PrismaClientKnownRequestError
        ) {
          if (error.code === 'P2002') {
            throw new ForbiddenException(
              'Credentials taken',
            );
          }
        }
        throw error;
      }
    }

    // const createAccountForBranchManager = (
    //   dto: CreateUserDto,
    // ) => {};
    //
    // const createAccountForHubManager = (
    //   dto: CreateUserDto,
    // ) => {};hello
    //------- main method create User-----------///
    try {
      //--- check role-----------------------//
      const user =
        await this.prisma.user.findUnique({
          where: { id: userId },
          include: { userRoles: true },
        });

      if (!user) {
        throw new Error('User not found');
      }

      const userRoleId =
        user.userRoles[0]?.roleId;

      if (!userRoleId) {
        throw new Error(
          'Role not found for the user',
        );
      }

      if (
        userRoleId == 511 ||
        userRoleId == 512 ||
        userRoleId == 521 ||
        userRoleId == 7
      )
        return 'you are not authentication!';

      if (userRoleId == 5) {
        return createAccountForALlRole(
          dto,
          this.prisma,
        );
      }
      if (userRoleId == 51) {
        if (
          dto.roleId == 511 ||
          dto.roleId == 512
        ) {
          return createAccountForALlRole(
            dto,
            this.prisma,
          );
        } else {
          return 'You are not authorized!';
        }
      }
      if (userRoleId == 52) {
        if (dto.roleId == 521) {
          return createAccountForALlRole(
            dto,
            this.prisma,
          );
        } else {
          return 'You are not authorized!';
        }
      }
    } catch (err) {
      console.log(
        'create user get ERROR : ',
        err,
      );
    }
  }

  async addAuth(userId: number, dto: AddAuthDto) {
    let userResponseDto: UserResponseDto =
      new UserResponseDto();
    //------- main method create Trans-----------///
    try {
      //--- check role-----------------------//
      const userRoleId: number | ResponseDto =
        await this.checkUserRoleId(userId);

      if (typeof userRoleId !== 'number') {
        userResponseDto =
          userRoleId as UserResponseDto;
        return userResponseDto;
      }

      const userAddAuthRoleId:
        | number
        | ResponseDto = await this.checkUserRoleId(
        dto.userId,
      );

      if (typeof userAddAuthRoleId !== 'number') {
        userResponseDto =
          userAddAuthRoleId as UserResponseDto;
        return userResponseDto;
      }

      if (
        userRoleId == 511 ||
        userRoleId == 512 ||
        userRoleId == 521 ||
        userRoleId == 7
      ) {
        userResponseDto.setStatusFail();
        userResponseDto.setMessage(
          'You are not authorized!',
        );
        userResponseDto.setData(null);
        return userResponseDto;
      }

      if (userRoleId == 5) {
        return addAuth(
          this.prisma,
          userId,
          dto,
          userAddAuthRoleId,
        );
      }
      if (userRoleId == 51) {
        if (
          userAddAuthRoleId == 511 ||
          userAddAuthRoleId == 512
        ) {
          return addAuth(
            this.prisma,
            userId,
            dto,
            userAddAuthRoleId,
          );
        } else {
          userResponseDto.setStatusFail();
          userResponseDto.setMessage(
            'You are not authorized!',
          );
          userResponseDto.setData(null);
          return userResponseDto;
        }
      }
      if (userRoleId == 52) {
        if (userAddAuthRoleId == 521) {
          return addAuth(
            this.prisma,
            userId,
            dto,
            userAddAuthRoleId,
          );
        } else {
          userResponseDto.setStatusFail();
          userResponseDto.setMessage(
            'You are not authorized!',
          );
          userResponseDto.setData(null);
          return userResponseDto;
        }
      }
    } catch (err) {
      console.log('add Auth get ERROR : ', err);
      userResponseDto.setStatusFail();
      userResponseDto.setMessage(
        'add Auth get ERROR : ' + err,
      );
      userResponseDto.setData(null);
      return userResponseDto;
    }
    // --------------END check role -----------//

    //----------- function add Auth -------------//

    async function addAuth(
      prisma: PrismaService,
      userId: number,
      dto: AddAuthDto,
      userAddAuthRoleId: number,
    ) {
      let addAuthInforDto = new AddAuthInforDto();
      addAuthInforDto.setInforAuth(
        userAddAuthRoleId,
        dto.transId,
        dto.hubId,
      );

      const existUserId =
        await prisma.userPoint.findMany({
          where: {
            userId: dto.userId,
          },
        });
      console.log(existUserId);
      if (existUserId[0]) {
        userResponseDto.setStatusFail();
        userResponseDto.setMessage(
          `UserId already existed auth!`,
        );
        userResponseDto.setData(null);
        return userResponseDto;
      }
      try {
        const addAuthPrisma =
         await prisma.userPoint.create({
            data: {
              userId: dto.userId,
              type: addAuthInforDto.type,
              transId: addAuthInforDto.transId,
              hubId: addAuthInforDto.hubId,
            },
          });
        if (addAuthPrisma) {
          userResponseDto.setStatusOK();
          userResponseDto.setData(addAuthPrisma);
          return userResponseDto;
        }
      } catch (error) {
        userResponseDto.setStatusFail();
        userResponseDto.setMessage(
          `add auth have error :` + error,
        );
        userResponseDto.setData(null);
        return userResponseDto;
      }
      // ------- END function -----------------------------//
    }
  }


  // find Trans Hub for User
  async findTransForUser(userId: number) {
    const userResponseDto = new UserResponseDto();
    try {
      const check = await this.prisma.userPoint.findMany({
        where : {
          userId: userId,
        }
      })
      if (!check[0]) {
        userResponseDto.setStatusFail();
        userResponseDto.setMessage('user not manager this point');
        userResponseDto.setData(null);
        return userResponseDto;
      }
      if (check[0].transId !== '404') {
        userResponseDto.setStatusOK();
        userResponseDto.setMessage('trans');
        userResponseDto.setData(check[0].transId);
        return userResponseDto;
      }else {
        userResponseDto.setStatusOK();
        userResponseDto.setMessage('hub');
        userResponseDto.setData(check[0].hubId);
        return userResponseDto;
      }
    }
    catch(err) {
      console.log("find trans hub for user get error : " + err);
      return false;
    }
  }

 // find user on point 

 async findUserOnPoint(userId: number, pointId: string) {
  const userResponseDto = new UserResponseDto();
  try {
   
  }
  catch(err) {
    console.log("find user on Point get error : " + err);
    return false;
  }
}


  //--- for other API---------- //
  checkUserRoleId = async (
    userId: number,
  ): Promise<number | ResponseDto> => {
    const responseDto: ResponseDto =
      new ResponseDto();
    const user =
      await this.prisma.user.findUnique({
        where: { id: userId },
        include: { userRoles: true },
      });
    if (!user) {
      responseDto.setStatusFail();
      responseDto.setMessage('User not found');
      responseDto.setData(null);
      return responseDto;
    }
    if (!user.userRoles) {
      responseDto.setStatusFail();
      responseDto.setMessage(
        'UserRole not found',
      );
      responseDto.setData(null);
      return responseDto;
    }
    const userRoleId =
      user['userRoles'][0]?.roleId;

    if (!userRoleId) {
      console.log(userRoleId);
      responseDto.setStatusFail();
      responseDto.setMessage(
        'Role not found for the user',
      );
      responseDto.setData(null);
      return responseDto;
    }
    return userRoleId;
  };


  async getUser(user: User) {
    try {
      const userType: UserPoint = await this.prisma.userPoint.findUnique({
        where: {
          userId : user.id
        }
       });
       const role:  UserRole[] = await this.prisma.userRole.findMany({
        where: {
          userId: user.id,
        }
       })
       const userinforResponseDto = new UserinforResponseDto();
       userinforResponseDto.setStatusOK();
       userinforResponseDto.setUserInfor(user,userType,role[0]);
       return userinforResponseDto;
    } catch (error) {
      console.log(error);
      
    }
  }

  async getTypeUser(userId: number) {
    try {
      const userType = await this.prisma.userPoint.findUnique({
        where: {
          userId : userId
        }
       });
       return userType;
    } catch (error) {
      console.log(error);
    }

  }

}